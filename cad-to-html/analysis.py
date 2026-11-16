"""Geometry analysis: per-part properties, geometry hash, cylinders, interference, BOM, mass.

All lengths in mm, volumes in mm^3, densities in g/cm^3, masses in g.
"""
from __future__ import annotations

import csv
import fnmatch
import hashlib
import re
from dataclasses import dataclass, field

import numpy as np
import trimesh


# ---------------------------------------------------------------------------
# Per-prototype properties
# ---------------------------------------------------------------------------
@dataclass
class PartProps:
    volume: float | None          # mm^3 (None if it could not be determined)
    area: float
    com: np.ndarray               # local centre of mass
    bbox_min: np.ndarray          # local bounding box
    bbox_max: np.ndarray
    geometry_hash: str
    watertight: bool
    cylinders: list = field(default_factory=list)   # local frame
    solid_mesh: trimesh.Trimesh | None = None       # merged mesh for boolean checks


def part_properties(part):
    mesh = part.mesh
    solid = mesh.copy()
    solid.merge_vertices()
    watertight = bool(len(solid.faces)) and solid.is_watertight
    if part.shape is not None:
        bmin, bmax = exact_bbox(part.shape)
    elif len(mesh.vertices):
        bmin, bmax = mesh.vertices.min(0), mesh.vertices.max(0)
    else:
        bmin = bmax = np.zeros(3)

    if part.shape is not None:
        volume, area, com, inertia = _occ_mass_props(part.shape)
    elif len(solid.faces):
        # density 1; for open meshes these numbers are approximate (a warning is emitted)
        volume = abs(float(solid.volume)) or None
        area, com, inertia = float(solid.area), np.asarray(solid.center_mass), np.asarray(solid.moment_inertia)
    else:
        volume, area, com, inertia = None, 0.0, np.zeros(3), np.zeros((3, 3))

    cylinders = find_cylinders(part.shape) if part.shape is not None else []
    return PartProps(volume, area, np.asarray(com, float), bmin, bmax,
                     geometry_hash(volume, area, inertia, len(mesh.faces)), watertight,
                     cylinders, solid if watertight else None)


def exact_bbox(shape, world=None):
    """Tight B-rep bounding box (not the looser tessellation box). Optionally after a 4x4 move."""
    from OCP.Bnd import Bnd_Box
    from OCP.BRepBndLib import BRepBndLib
    box = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape if world is None else _moved(shape, world), box, False, False)
    if box.IsVoid():
        return np.zeros(3), np.zeros(3)
    x0, y0, z0, x1, y1, z1 = box.Get()
    return np.array([x0, y0, z0]), np.array([x1, y1, z1])


def _occ_mass_props(shape):
    from OCP.GProp import GProp_GProps
    from OCP.BRepGProp import BRepGProp
    vprops, sprops = GProp_GProps(), GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, vprops)
    BRepGProp.SurfaceProperties_s(shape, sprops)
    c = vprops.CentreOfMass()
    mat = vprops.MatrixOfInertia()
    inertia = np.array([[mat.Value(r, k) for k in (1, 2, 3)] for r in (1, 2, 3)])
    volume = abs(vprops.Mass())
    return (volume if volume > 1e-12 else None), sprops.Mass(), np.array([c.X(), c.Y(), c.Z()]), inertia


def geometry_hash(volume, area, inertia, n_faces):
    """Placement-independent fingerprint: volume, area and principal moments of inertia.

    Identical parts placed/rotated differently get the same hash. (Mirror-image parts
    also collide - acceptable for a BOM, and noted in the README.)
    """
    eig = np.sort(np.abs(np.linalg.eigvalsh((inertia + inertia.T) / 2))) if np.any(inertia) else [0, 0, 0]
    sig = "|".join(f"{v:.4g}" for v in [volume or 0.0, area, *eig])
    if not volume:
        sig += f"|{n_faces}"
    return hashlib.sha1(sig.encode()).hexdigest()[:10]


def find_cylinders(shape, max_count=12):
    """Cylindrical faces of a B-rep (holes, bosses, pins). Returns dicts in the shape's frame."""
    from OCP.BRepAdaptor import BRepAdaptor_Surface
    from OCP.GeomAbs import GeomAbs_Cylinder
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_FACE
    from OCP.TopoDS import TopoDS
    from OCP.Bnd import Bnd_Box
    from OCP.BRepBndLib import BRepBndLib

    found = []
    exp = TopExp_Explorer(shape, TopAbs_FACE)
    while exp.More():
        face = TopoDS.Face_s(exp.Current())
        exp.Next()
        surf = BRepAdaptor_Surface(face)
        if surf.GetType() != GeomAbs_Cylinder:
            continue
        cyl = surf.Cylinder()
        ax = cyl.Axis()
        d = np.array([ax.Direction().X(), ax.Direction().Y(), ax.Direction().Z()])
        d = canonical_direction(d)
        p = np.array([ax.Location().X(), ax.Location().Y(), ax.Location().Z()])
        box = Bnd_Box()
        BRepBndLib.Add_s(face, box)
        x0, y0, z0, x1, y1, z1 = box.Get()
        corners = np.array([[x, y, z] for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)])
        t = (corners - p) @ d
        centre = (corners.mean(0) - p) @ d
        found.append({"origin": p + d * centre, "axis": d, "radius": cyl.Radius(),
                      "length": float(t.max() - t.min())})  # exact for axis-aligned cylinders
    return merge_cylinders(found)[:max_count]


def canonical_direction(d):
    d = np.asarray(d, float)
    d = d / (np.linalg.norm(d) or 1.0)
    return -d if d[np.argmax(np.abs(d))] < 0 else d


def lines_coincide(p1, d1, p2, d2, tol):
    if abs(abs(np.dot(d1, d2)) - 1) > 1e-3:  # ~2.5 degrees
        return False
    off = np.asarray(p2) - np.asarray(p1)
    return np.linalg.norm(off - np.dot(off, d1) * d1) < tol


def merge_cylinders(cyls):
    """Merge faces of the same cylinder (OCC often splits a cylinder into two half faces)."""
    merged = []
    for c in sorted(cyls, key=lambda c: -c["radius"] * c["length"]):
        for m in merged:
            if abs(m["radius"] - c["radius"]) < 1e-3 and lines_coincide(m["origin"], m["axis"],
                                                                         c["origin"], c["axis"], 1e-3):
                m["length"] = max(m["length"], c["length"])
                break
        else:
            merged.append(dict(c))
    return merged


# ---------------------------------------------------------------------------
# Instances (leaves of the tree) in world coordinates
# ---------------------------------------------------------------------------
@dataclass
class Instance:
    id: str
    name: str
    part_key: str
    world: np.ndarray
    bbox_min: np.ndarray
    bbox_max: np.ndarray
    com: np.ndarray
    volume: float | None
    cylinders: list
    material: str | None = None
    density: float | None = None

    @property
    def mass(self):
        if self.volume is None or self.density is None:
            return None
        return self.volume * self.density / 1000.0  # mm^3 * g/cm^3 -> g


def analyze(model):
    """Compute PartProps for every prototype and an Instance for every leaf."""
    props = {key: part_properties(part) for key, part in model.parts.items()}
    instances = []
    for nid in model.leaves():
        node = model.nodes[nid]
        p = props[node.part_key]
        w = model.world(nid)
        verts = model.parts[node.part_key].mesh.vertices
        if model.parts[node.part_key].shape is not None:
            bmin, bmax = exact_bbox(model.parts[node.part_key].shape, w)
        elif len(verts):
            wv = trimesh.transform_points(verts, w)
            bmin, bmax = wv.min(0), wv.max(0)
        else:
            bmin = bmax = w[:3, 3].copy()
        cyls = [{"origin": trimesh.transform_points([c["origin"]], w)[0],
                 "axis": canonical_direction(w[:3, :3] @ c["axis"]),
                 "radius": c["radius"], "length": c["length"]} for c in p.cylinders]
        instances.append(Instance(nid, node.name, node.part_key, w, bmin, bmax,
                                  trimesh.transform_points([p.com], w)[0], p.volume, cyls))
    return props, instances


def overall_bbox(instances):
    lo = np.min([i.bbox_min for i in instances], axis=0)
    hi = np.max([i.bbox_max for i in instances], axis=0)
    return lo, hi


# ---------------------------------------------------------------------------
# Materials / mass
# ---------------------------------------------------------------------------
def assign_materials(model, instances, manifest, default_density=None):
    """Set material + density on each instance from the manifest (globs on id or name)."""
    materials = manifest.get("materials", {}) if manifest else {}
    rules = manifest.get("part_materials", {}) if manifest else {}
    if default_density is None and manifest:
        default_density = manifest.get("default_density")
    for inst in instances:
        part_name = model.parts[inst.part_key].name
        for pattern, mat in rules.items():
            in_assembly = inst.id.startswith(pattern.rstrip("/") + "/")  # pattern is an assembly id
            if in_assembly or any(fnmatch.fnmatchcase(s, pattern) for s in (inst.id, inst.name, part_name)):
                inst.material = mat
                inst.density = materials.get(mat, {}).get("density")
                break
        if inst.density is None and default_density is not None:
            inst.density = float(default_density)
            inst.material = inst.material or f"default ({default_density} g/cm³)"


def mass_summary(instances):
    vols = [i.volume for i in instances if i.volume]
    total_volume = float(sum(vols))
    masses = [i.mass for i in instances]
    known = [m for m in masses if m is not None]
    total_mass = float(sum(known)) if known else None
    # COM weighted by mass when every part has a density, otherwise by volume (uniform density).
    use_mass = known and len(known) == len(instances)
    weights = np.array([(i.mass if use_mass else (i.volume or 0.0)) for i in instances])
    if weights.sum() > 0:
        com = (np.array([i.com for i in instances]) * weights[:, None]).sum(0) / weights.sum()
    else:
        com = np.mean([(i.bbox_min + i.bbox_max) / 2 for i in instances], axis=0)
    return {"total_volume": total_volume, "total_mass": total_mass,
            "mass_complete": bool(use_mass), "missing_mass": len(instances) - len(known),
            "com": com, "com_basis": "mass" if use_mass else "volume (uniform density)"}


# ---------------------------------------------------------------------------
# Interference
# ---------------------------------------------------------------------------
MAX_PAIRS = 3000


def find_interferences(model, props, instances, warnings):
    """Pairs whose solids overlap by a real volume (touching faces are not reported)."""
    results = []
    candidates = []
    for a in range(len(instances)):
        for b in range(a + 1, len(instances)):
            ia, ib = instances[a], instances[b]
            if np.all(ia.bbox_min < ib.bbox_max - 1e-6) and np.all(ib.bbox_min < ia.bbox_max - 1e-6):
                candidates.append((ia, ib))
    if len(candidates) > MAX_PAIRS:
        warnings.append(f"Interference check limited to {MAX_PAIRS} of {len(candidates)} candidate pairs.")
        candidates = candidates[:MAX_PAIRS]
    unchecked = 0
    for ia, ib in candidates:
        vol = _overlap_volume(model, props, ia, ib)
        if vol is None:
            unchecked += 1
            continue
        smaller = min(v for v in (ia.volume, ib.volume, np.inf) if v)
        if vol > max(1e-3, 1e-6 * smaller):
            results.append({"a": ia.id, "b": ib.id, "volume": float(vol)})
    if unchecked:
        warnings.append(f"{unchecked} overlapping-bbox pair(s) could not be checked for interference "
                        "(non-solid meshes).")
    return results


def _overlap_volume(model, props, ia, ib):
    sa, sb = model.parts[ia.part_key].shape, model.parts[ib.part_key].shape
    if sa is not None and sb is not None:
        try:
            return _occ_common_volume(sa, ia.world, sb, ib.world)
        except Exception:
            pass
    ma, mb = props[ia.part_key].solid_mesh, props[ib.part_key].solid_mesh
    if ma is None or mb is None:
        return None
    try:
        a = ma.copy().apply_transform(ia.world)
        b = mb.copy().apply_transform(ib.world)
        inter = trimesh.boolean.intersection([a, b], engine="manifold")
        return abs(float(inter.volume)) if len(inter.faces) else 0.0
    except Exception:
        return None


def _occ_common_volume(shape_a, world_a, shape_b, world_b):
    from OCP.BRepAlgoAPI import BRepAlgoAPI_Common
    from OCP.GProp import GProp_GProps
    from OCP.BRepGProp import BRepGProp
    common = BRepAlgoAPI_Common(_moved(shape_a, world_a), _moved(shape_b, world_b))
    if not common.IsDone():
        raise RuntimeError("boolean failed")
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(common.Shape(), props)
    return abs(props.Mass())


def _moved(shape, m):
    from OCP.gp import gp_Trsf
    from OCP.TopLoc import TopLoc_Location
    t = gp_Trsf()
    t.SetValues(*m[0, :4], *m[1, :4], *m[2, :4])
    return shape.Moved(TopLoc_Location(t))


# ---------------------------------------------------------------------------
# Warnings
# ---------------------------------------------------------------------------
def geometry_warnings(model, props, instances):
    out = []
    lo, hi = overall_bbox(instances)
    diag = float(np.linalg.norm(hi - lo)) or 1.0
    seen = set()
    for inst in instances:
        if inst.part_key in seen:
            continue
        seen.add(inst.part_key)
        name = model.parts[inst.part_key].name
        size = float(np.linalg.norm(inst.bbox_max - inst.bbox_min))
        if size < 0.01 * diag:
            out.append(f"Tiny part '{name}' ({size:.3g} mm across, <1% of the model size).")
        if props[inst.part_key].volume is None:
            out.append(f"Part '{name}' has no measurable volume (surface/sheet body or open mesh).")
    return out


# ---------------------------------------------------------------------------
# BOM
# ---------------------------------------------------------------------------
BOM_COLUMNS = ["item", "name", "quantity", "geometry_hash", "bbox_x_mm", "bbox_y_mm", "bbox_z_mm",
               "volume_mm3", "material", "density_g_cm3", "unit_mass_g", "total_mass_g",
               "parent_assembly", "instance_ids"]


def common_stem(names):
    stems = {re.sub(r"[\s_\-.]*(\(\d+\)|#\d+|\d+)$", "", n) or n for n in names}
    return stems.pop() if len(stems) == 1 else names[0]


def build_bom(model, props, instances):
    groups = {}
    for inst in instances:
        key = (props[inst.part_key].geometry_hash, inst.material)
        groups.setdefault(key, []).append(inst)
    rows = []
    for item, ((ghash, material), insts) in enumerate(groups.items(), start=1):
        p = props[insts[0].part_key]
        size = p.bbox_max - p.bbox_min
        parents = []
        for inst in insts:
            parent = model.nodes[model.nodes[inst.id].parent].name if model.nodes[inst.id].parent else ""
            if parent not in parents:
                parents.append(parent)
        unit_mass = insts[0].mass
        rows.append({
            "item": item,
            "name": common_stem([i.name for i in insts]) if len(insts) > 1 else insts[0].name,
            "quantity": len(insts),
            "geometry_hash": ghash,
            "bbox_x_mm": round(float(size[0]), 3), "bbox_y_mm": round(float(size[1]), 3),
            "bbox_z_mm": round(float(size[2]), 3),
            "volume_mm3": round(p.volume, 3) if p.volume else None,
            "material": material or "",
            "density_g_cm3": insts[0].density,
            "unit_mass_g": round(unit_mass, 3) if unit_mass is not None else None,
            "total_mass_g": round(unit_mass * len(insts), 3) if unit_mass is not None else None,
            "parent_assembly": "; ".join(parents),
            "instance_ids": "; ".join(i.id for i in insts),
        })
    return rows


def write_bom_csv(rows, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=BOM_COLUMNS)
        writer.writeheader()
        for r in rows:
            writer.writerow({k: ("" if r[k] is None else r[k]) for k in BOM_COLUMNS})


def write_bom_xlsx(rows, path, title):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    wb = Workbook()
    ws = wb.active
    ws.title = "BOM"
    headers = ["Item", "Name", "Qty", "Geometry hash", "BBox X (mm)", "BBox Y (mm)", "BBox Z (mm)",
               "Volume (mm³)", "Material", "Density (g/cm³)", "Unit mass (g)", "Total mass (g)",
               "Parent assembly", "Instance ids"]
    ws.append([f"Bill of materials: {title}"])
    ws["A1"].font = Font(bold=True, size=13)
    ws.append(headers)
    for cell in ws[2]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="3B5B87")
        cell.alignment = Alignment(horizontal="center")
    for r in rows:
        ws.append([r[k] for k in BOM_COLUMNS])
    last = ws.max_row
    ws.append([])
    ws.append(["", "Total", f"=SUM(C3:C{last})", "", "", "", "", "", "", "", "",
               f"=SUM(L3:L{last})" if any(r["total_mass_g"] is not None for r in rows) else ""])
    ws[f"B{last + 2}"].font = Font(bold=True)
    widths = [6, 28, 6, 13, 11, 11, 11, 13, 18, 14, 13, 13, 22, 50]
    for i, w in enumerate(widths):
        ws.column_dimensions[chr(65 + i)].width = w
    ws.freeze_panes = "A3"
    wb.save(path)
