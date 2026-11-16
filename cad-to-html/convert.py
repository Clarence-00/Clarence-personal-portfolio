"""Load a 3D model into a simple assembly Model and export it as GLB.

Supported inputs
  STEP/STP, IGES/IGS  -> via CadQuery's OCP (OpenCascade) XCAF reader:
                         assembly tree, names, colours and instance transforms kept.
  STL, OBJ, GLB/GLTF  -> via trimesh.

Native CAD formats (SLDPRT, IPT, F3D, ...) are rejected with a clear message.

CLI:
    python convert.py path/to/model.step -o out/model.glb [--tolerance 0.1]
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import trimesh

CAD_EXTS = {".step", ".stp", ".iges", ".igs"}
MESH_EXTS = {".stl", ".obj", ".glb", ".gltf", ".ply", ".off"}
NATIVE_CAD = {
    ".sldprt": "SolidWorks part", ".sldasm": "SolidWorks assembly",
    ".ipt": "Inventor part", ".iam": "Inventor assembly",
    ".f3d": "Fusion 360 archive", ".f3z": "Fusion 360 archive",
    ".prt": "Creo/NX part", ".asm": "Creo/Solid Edge assembly", ".par": "Solid Edge part",
    ".catpart": "CATIA part", ".catproduct": "CATIA product",
    ".x_t": "Parasolid", ".x_b": "Parasolid", ".3dm": "Rhino", ".skp": "SketchUp",
    ".fcstd": "FreeCAD", ".dwg": "AutoCAD", ".dxf": "DXF (2D)", ".blend": "Blender",
}
UNIT_SCALE = {"mm": 1.0, "cm": 10.0, "m": 1000.0, "in": 25.4, "ft": 304.8}

# Pleasant default colours (sRGB) for parts that come without one.
PALETTE = [(0.36, 0.54, 0.75), (0.85, 0.55, 0.25), (0.45, 0.68, 0.45), (0.75, 0.40, 0.45),
           (0.58, 0.50, 0.75), (0.70, 0.62, 0.40), (0.40, 0.65, 0.70), (0.62, 0.62, 0.64)]


class ConversionError(Exception):
    """Raised for unsupported or unreadable input files (message is user-facing)."""


@dataclass
class Part:
    """A unique piece of geometry (a 'prototype'); may be used by several instances."""
    key: str
    name: str
    mesh: trimesh.Trimesh            # render mesh in the part's local frame (mm)
    color: tuple | None = None       # sRGB 0..1 (r, g, b, a)
    shape: object = None             # OCC TopoDS_Shape (local frame) for CAD inputs
    failed_faces: int = 0


@dataclass
class Node:
    """A node of the assembly tree. Leaves reference a Part, assemblies have children."""
    id: str
    name: str
    parent: str | None
    local: np.ndarray                # 4x4 transform relative to parent
    part_key: str | None = None
    color: tuple | None = None       # instance colour override (sRGB rgba)
    children: list = field(default_factory=list)

    @property
    def is_part(self):
        return self.part_key is not None


@dataclass
class Model:
    name: str
    source: str
    nodes: dict = field(default_factory=dict)  # id -> Node, in tree order
    parts: dict = field(default_factory=dict)  # key -> Part
    root: str = ""
    warnings: list = field(default_factory=list)
    has_brep: bool = False

    # --- tree helpers -----------------------------------------------------
    def add_node(self, name, parent, local, part_key=None, color=None):
        """Add a node with a unique, readable path id like 'box/lid_assembly/lid'."""
        base = name if parent is None else f"{parent}/{name}"
        node_id, n = base, 2
        while node_id in self.nodes:
            node_id, n = f"{base}#{n}", n + 1
        node = Node(node_id, name, parent, np.asarray(local, float), part_key, color)
        self.nodes[node_id] = node
        if parent is None:
            self.root = node_id
        else:
            self.nodes[parent].children.append(node_id)
        return node_id

    def world(self, node_id):
        m = np.eye(4)
        while node_id is not None:
            node = self.nodes[node_id]
            m = node.local @ m
            node_id = node.parent
        return m

    def leaves(self, under=None):
        start = under or self.root
        out, stack = [], [start]
        while stack:
            nid = stack.pop()
            node = self.nodes[nid]
            if node.is_part:
                out.append(nid)
            stack.extend(reversed(node.children))
        return out

    def color_of(self, node_id):
        node = self.nodes[node_id]
        return node.color or self.parts[node.part_key].color


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def load_model(path, tolerance=None, angular=0.3, units="mm"):
    """Load any supported file into a Model. tolerance = linear deflection in mm (auto if None)."""
    path = Path(path)
    ext = path.suffix.lower()
    if ext in NATIVE_CAD:
        raise ConversionError(
            f"'{path.name}' is a native {NATIVE_CAD[ext]} file, which cannot be read without the "
            f"original CAD program.\n  -> Export it as STEP (.step/.stp, preferably AP214 or AP242 "
            f"with colours/names) and run again. STL/OBJ/GLB also work but lose the assembly tree.")
    if not path.exists():
        raise ConversionError(f"File not found: {path}")
    if ext in CAD_EXTS:
        model = _load_cad(path, tolerance, angular)
    elif ext in MESH_EXTS:
        model = _load_mesh(path, UNIT_SCALE[units])
    else:
        raise ConversionError(
            f"Unsupported file type '{ext}'. Supported: {', '.join(sorted(CAD_EXTS | MESH_EXTS))}.")
    _assign_default_colors(model)
    if not model.leaves():
        raise ConversionError(f"No geometry found in {path.name}.")
    return model


def _assign_default_colors(model):
    for i, part in enumerate(model.parts.values()):
        if part.color is None:
            part.color = PALETTE[i % len(PALETTE)] + (1.0,)


def clean_name(name, fallback):
    """Trim whitespace; replace empty/auto-generated names with a fallback."""
    name = (name or "").strip()
    if not name or looks_auto_named(name):
        return fallback
    return name


AUTO_NAME = re.compile(r"^(=>\[.*\]|\d+|solid|shape|body|part|compound|mesh|geometry|"
                       r"open\s?cascade.*|unnamed.*|noname.*|component\d*)$", re.I)


def looks_auto_named(name):
    return bool(AUTO_NAME.match(name.strip()))


# ---------------------------------------------------------------------------
# STEP / IGES via OCP
# ---------------------------------------------------------------------------
def _load_cad(path, tolerance, angular):
    try:
        from OCP.TDocStd import TDocStd_Document
        from OCP.TCollection import TCollection_ExtendedString
        from OCP.XCAFDoc import XCAFDoc_DocumentTool
        from OCP.IFSelect import IFSelect_ReturnStatus
    except ImportError as exc:
        raise ConversionError(
            "STEP/IGES support needs CadQuery/OCP: `pip install cadquery` "
            "(or `conda install -c conda-forge cadquery`). " + str(exc))

    doc = TDocStd_Document(TCollection_ExtendedString("XmlOcaf"))
    if path.suffix.lower() in (".step", ".stp"):
        from OCP.STEPCAFControl import STEPCAFControl_Reader
        reader = STEPCAFControl_Reader()
    else:
        from OCP.IGESCAFControl import IGESCAFControl_Reader
        reader = IGESCAFControl_Reader()
    reader.SetNameMode(True)
    reader.SetColorMode(True)
    status = reader.ReadFile(str(path))
    if status != IFSelect_ReturnStatus.IFSelect_RetDone:
        raise ConversionError(f"OpenCascade could not read {path.name} (status {status}). "
                              "Is it a valid STEP/IGES file?")
    if not reader.Transfer(doc):
        raise ConversionError(f"OpenCascade failed to transfer the shapes in {path.name}.")

    model = Model(name=path.stem, source=str(path), has_brep=True)
    walker = _XcafWalker(doc, model, XCAFDoc_DocumentTool)
    walker.run()
    _maybe_split_single_compound(model)
    _tessellate_all(model, tolerance, angular)
    return model


class _XcafWalker:
    """Walks the XCAF label tree, creating Model nodes and Part prototypes."""

    def __init__(self, doc, model, doc_tool):
        self.model = model
        self.shape_tool = doc_tool.ShapeTool_s(doc.Main())
        self.color_tool = doc_tool.ColorTool_s(doc.Main())
        self.proto_for_label = {}

    def run(self):
        from OCP.TDF import TDF_LabelSequence
        free = TDF_LabelSequence()
        self.shape_tool.GetFreeShapes(free)
        labels = [free.Value(i) for i in range(1, free.Length() + 1)]
        st = self.shape_tool
        if len(labels) == 1 and st.IsAssembly_s(labels[0]):
            self.visit(labels[0], None, np.eye(4), None, None)  # file's own top assembly is root
        else:
            root = self.model.add_node(self.model.name, None, np.eye(4))
            for label in labels:
                self.visit(label, root, np.eye(4), None, None)

    def name(self, label):
        from OCP.TDataStd import TDataStd_Name
        attr = TDataStd_Name()
        if label.FindAttribute(TDataStd_Name.GetID_s(), attr):
            return attr.Get().ToExtString()
        return ""

    def color(self, label):
        from OCP.XCAFDoc import XCAFDoc_ColorTool, XCAFDoc_ColorType
        from OCP.Quantity import Quantity_ColorRGBA, Quantity_Color
        rgba = Quantity_ColorRGBA()
        for ctype in (XCAFDoc_ColorType.XCAFDoc_ColorSurf, XCAFDoc_ColorType.XCAFDoc_ColorGen):
            if XCAFDoc_ColorTool.GetColor_s(label, ctype, rgba):
                rgb = rgba.GetRGB()  # OCCT stores linear RGB; convert to sRGB for display
                to_srgb = Quantity_Color.Convert_LinearRGB_To_sRGB_s
                return (to_srgb(rgb.Red()), to_srgb(rgb.Green()), to_srgb(rgb.Blue()), rgba.Alpha())
        return None

    def visit(self, label, parent, local, inst_name, inst_color):
        from OCP.TDF import TDF_Label, TDF_LabelSequence
        st = self.shape_tool
        if st.IsReference_s(label):
            ref = TDF_Label()
            st.GetReferredShape_s(label, ref)
            loc = _matrix_from_location(st.GetLocation_s(label))
            self.visit(ref, parent, local @ loc, self.name(label), self.color(label))
            return

        proto_name = self.name(label)
        name = inst_name if inst_name and not looks_auto_named(inst_name) else proto_name
        if st.IsAssembly_s(label):
            name = clean_name(name, "assembly")
            node_id = self.model.add_node(name, parent, local)
            comps = TDF_LabelSequence()
            st.GetComponents_s(label, comps)
            for i in range(1, comps.Length() + 1):
                self.visit(comps.Value(i), node_id, np.eye(4), None, None)
            return

        # A simple shape = one part prototype (shared by every instance referring to it).
        key = label_entry(label)  # e.g. "0:1:1:3", stable for the document
        if key not in self.proto_for_label:
            shape = st.GetShape_s(label)
            pname = clean_name(proto_name, f"part_{len(self.model.parts) + 1}")
            self.model.parts[key] = Part(key, pname, None, self.color(label), shape)
            self.proto_for_label[key] = key
            if not proto_name or looks_auto_named(proto_name):
                self.model.warnings.append(f"Unnamed part (auto-named '{pname}').")
        name = clean_name(name, self.model.parts[key].name)
        self.model.add_node(name, parent, local, part_key=key, color=inst_color)


def label_entry(label):
    from OCP.TDF import TDF_Tool
    from OCP.TCollection import TCollection_AsciiString
    entry = TCollection_AsciiString()
    TDF_Tool.Entry_s(label, entry)
    return entry.ToCString()


def _matrix_from_location(loc):
    trsf = loc.Transformation()
    m = np.eye(4)
    for r in range(3):
        for c in range(4):
            m[r, c] = trsf.Value(r + 1, c + 1)
    return m


def _maybe_split_single_compound(model):
    """Some exporters flatten a whole assembly into one compound part. Split it into solids."""
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_SOLID
    if len(model.parts) != 1 or len(model.leaves()) != 1:
        return
    part = next(iter(model.parts.values()))
    solids = []
    exp = TopExp_Explorer(part.shape, TopAbs_SOLID)
    while exp.More():
        solids.append(exp.Current())
        exp.Next()
    if len(solids) < 2:
        return
    leaf_id = model.leaves()[0]
    leaf = model.nodes[leaf_id]
    model.parts.clear()
    leaf.part_key = None  # becomes an assembly node
    for i, solid in enumerate(solids, start=1):
        key = f"{part.key}:{i}"
        model.parts[key] = Part(key, f"{part.name}_body{i}", None, part.color, solid)
        model.add_node(f"{part.name}_body{i}", leaf_id, np.eye(4), part_key=key)
    model.warnings.append(f"'{part.name}' was a single multi-body part; split into "
                          f"{len(solids)} bodies (no assembly structure in the file).")


def _tessellate_all(model, tolerance, angular):
    """Mesh every prototype. Auto tolerance = 0.2% of the part's size, clamped to [0.005, 0.5] mm."""
    for part in model.parts.values():
        part.mesh, part.failed_faces = tessellate(part.shape, tolerance, angular)
        if part.failed_faces:
            model.warnings.append(f"Part '{part.name}': {part.failed_faces} face(s) failed to tessellate.")
        if len(part.mesh.faces) == 0:
            model.warnings.append(f"Part '{part.name}' produced no triangles (failed conversion).")


def shape_diagonal(shape):
    from OCP.Bnd import Bnd_Box
    from OCP.BRepBndLib import BRepBndLib
    box = Bnd_Box()
    BRepBndLib.Add_s(shape, box)
    if box.IsVoid():
        return 0.0
    x0, y0, z0, x1, y1, z1 = box.Get()
    return float(np.linalg.norm([x1 - x0, y1 - y0, z1 - z0]))


def tessellate(shape, tolerance=None, angular=0.3):
    """Triangulate an OCC shape. Returns (trimesh, failed_face_count).

    Vertices are NOT merged between B-rep faces, so sharp CAD edges shade crisply.
    """
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.BRep import BRep_Tool
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
    from OCP.TopoDS import TopoDS
    from OCP.TopLoc import TopLoc_Location

    if tolerance is None:
        tolerance = float(np.clip(shape_diagonal(shape) * 0.002, 0.005, 0.5))
    BRepMesh_IncrementalMesh(shape, tolerance, False, angular, True)

    verts, faces, failed, offset = [], [], 0, 0
    exp = TopExp_Explorer(shape, TopAbs_FACE)
    while exp.More():
        face = TopoDS.Face_s(exp.Current())
        exp.Next()
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(face, loc)
        if tri is None:
            failed += 1
            continue
        trsf = loc.Transformation()
        n = tri.NbNodes()
        pts = np.empty((n, 3))
        for i in range(1, n + 1):
            p = tri.Node(i).Transformed(trsf)
            pts[i - 1] = (p.X(), p.Y(), p.Z())
        tris = np.empty((tri.NbTriangles(), 3), dtype=np.int64)
        for i in range(1, tri.NbTriangles() + 1):
            tris[i - 1] = tri.Triangle(i).Get()
        tris -= 1
        if face.Orientation() == TopAbs_REVERSED:
            tris = tris[:, ::-1]
        verts.append(pts)
        faces.append(tris + offset)
        offset += n
    if not verts:
        return trimesh.Trimesh(), failed
    mesh = trimesh.Trimesh(np.vstack(verts), np.vstack(faces), process=False)
    return mesh, failed


# ---------------------------------------------------------------------------
# STL / OBJ / GLB via trimesh
# ---------------------------------------------------------------------------
def _load_mesh(path, scale):
    try:
        scene = trimesh.load(str(path), force="scene")
    except Exception as exc:  # trimesh raises many different types
        raise ConversionError(f"trimesh could not read {path.name}: {exc}")

    model = Model(name=path.stem, source=str(path))
    graph = scene.graph
    children = graph.transforms.children
    scale_m = np.diag([scale, scale, scale, 1.0])

    def edge_matrix(parent, child):
        data = graph.transforms.edge_data.get((parent, child), {})
        return np.asarray(data.get("matrix", np.eye(4)), float)

    def add(frame, parent_frame, parent_id, local):
        geom_name = (graph.transforms.node_data.get(frame, {}).get("geometry")
                     or graph.transforms.edge_data.get((parent_frame, frame), {}).get("geometry"))
        kids = children.get(frame, [])
        name = clean_name(str(frame), geom_name or "part")
        if geom_name is not None and geom_name in scene.geometry:
            geom = scene.geometry[geom_name]
            if not isinstance(geom, trimesh.Trimesh):
                return  # skip point clouds / paths
            if geom_name not in model.parts:
                mesh = geom.copy()
                mesh.apply_transform(scale_m)
                model.parts[geom_name] = Part(geom_name, clean_name(geom_name, name), mesh,
                                              _mesh_color(geom))
            if kids:  # node with geometry AND children: put geometry on its own leaf
                node_id = model.add_node(name, parent_id, local)
                model.add_node(name + "_body", node_id, np.eye(4), part_key=geom_name)
            else:
                model.add_node(name, parent_id, local, part_key=geom_name)
                return
        else:
            node_id = model.add_node(name, parent_id, local)
        for kid in kids:
            add(kid, frame, node_id, _scale_translation(edge_matrix(frame, kid), scale))

    root_frame = graph.base_frame
    root_id = model.add_node(model.name, None, np.eye(4))
    for kid in children.get(root_frame, []):
        add(kid, root_frame, root_id, _scale_translation(edge_matrix(root_frame, kid), scale))

    # A single STL/OBJ blob with several disconnected bodies: keep as one part (safer).
    for part in model.parts.values():
        if not part.mesh.is_watertight:
            model.warnings.append(f"Mesh '{part.name}' is not watertight; its volume is approximate.")
    if path.suffix.lower() in (".glb", ".gltf") and scale == 1.0:
        size = max(scene.extents) if len(scene.geometry) else 0
        if size and size < 5:
            model.warnings.append(f"Model is only {size:.3g} units across; glTF is usually in metres. "
                                  "Re-run with --units m if it should be bigger.")
    return model


def _scale_translation(m, scale):
    m = m.copy()
    m[:3, 3] *= scale
    return m


def _mesh_color(mesh):
    """Best-effort main colour of a trimesh mesh (sRGB rgba 0..1), or None."""
    try:
        visual = mesh.visual
        if visual.kind == "texture" and visual.material is not None:
            c = getattr(visual.material, "baseColorFactor", None)
            if c is None:
                c = visual.material.main_color
            c = np.asarray(c, float)
        elif visual.kind in ("face", "vertex"):
            c = np.asarray(visual.main_color, float)
        else:
            return None
        if c.max() > 1.0:
            c = c / 255.0
        c = tuple(float(v) for v in c[:4])
        if len(c) == 3:
            c += (1.0,)
        # trimesh's untouched default grey is not a real colour
        return None if np.allclose(c[:3], 102 / 255.0, atol=0.01) else c
    except Exception:
        return None


# ---------------------------------------------------------------------------
def main(argv=None):
    from glb_writer import write_glb
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--output", help="output .glb (default: out/<name>/model.glb)")
    ap.add_argument("--tolerance", type=float, help="linear tessellation tolerance in mm (default: auto)")
    ap.add_argument("--units", default="mm", choices=UNIT_SCALE, help="units of mesh inputs")
    args = ap.parse_args(argv)
    try:
        model = load_model(args.input, args.tolerance, units=args.units)
    except ConversionError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    out = Path(args.output or f"out/{model.name}/model.glb")
    out.parent.mkdir(parents=True, exist_ok=True)
    write_glb(model, out)
    print(f"wrote {out}  ({len(model.leaves())} part instances, {len(model.parts)} unique meshes)")
    for w in model.warnings:
        print(f"warning: {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
