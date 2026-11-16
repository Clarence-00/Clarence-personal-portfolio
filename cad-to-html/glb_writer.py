"""Minimal, dependency-light GLB (binary glTF 2.0) writer for a convert.Model.

Why not trimesh's exporter? We want exact control over:
  * one glTF node per tree node, with the readable path id in node.extras.id
    (three.js mangles node *names*, but keeps extras as object.userData),
  * mesh re-use for instances (same part + colour -> same glTF mesh),
  * colours as PBR materials.

Units are millimetres (recorded in asset.extras.units). Z is up, as in most CAD.
"""
from __future__ import annotations

import json
import struct

import numpy as np
import trimesh


def srgb_to_linear(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def render_arrays(part, is_brep):
    """Positions, normals, indices for a part. Mesh inputs get split at sharp edges for nicer shading."""
    mesh = part.mesh
    if not is_brep and len(mesh.faces):
        mesh = trimesh.graph.smooth_shade(mesh, angle=np.radians(30))
    pos = np.asarray(mesh.vertices, np.float32)
    nrm = np.asarray(mesh.vertex_normals, np.float32) if len(mesh.faces) else np.zeros_like(pos)
    idx = np.asarray(mesh.faces, np.uint32).reshape(-1)
    return pos, nrm, idx


def build_gltf(model):
    gltf = {
        "asset": {"version": "2.0", "generator": "cad-to-html", "extras": {"units": "mm", "up": "+Z"}},
        "scene": 0, "scenes": [{"name": model.name, "nodes": []}],
        "nodes": [], "meshes": [], "materials": [], "accessors": [], "bufferViews": [],
        "buffers": [{"byteLength": 0}],
    }
    blob = bytearray()

    def add_view(data, target):
        while len(blob) % 4:
            blob.append(0)
        gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(blob),
                                    "byteLength": len(data), "target": target})
        blob.extend(data)
        return len(gltf["bufferViews"]) - 1

    def add_accessor(view, ctype, count, atype, **extra):
        gltf["accessors"].append({"bufferView": view, "componentType": ctype,
                                  "count": int(count), "type": atype, **extra})
        return len(gltf["accessors"]) - 1

    material_index = {}

    def material_for(rgba):
        key = tuple(round(float(v), 4) for v in rgba)
        if key not in material_index:
            lin = srgb_to_linear(key[:3]).tolist()
            mat = {"name": "#%02x%02x%02x" % tuple(int(v * 255 + 0.5) for v in key[:3]),
                   "pbrMetallicRoughness": {"baseColorFactor": lin + [key[3]],
                                            "metallicFactor": 0.1, "roughnessFactor": 0.6},
                   "doubleSided": True}
            if key[3] < 1:
                mat["alphaMode"] = "BLEND"
            gltf["materials"].append(mat)
            material_index[key] = len(gltf["materials"]) - 1
        return material_index[key]

    mesh_index = {}

    def mesh_for(part_key, rgba):
        key = (part_key, tuple(rgba))
        if key in mesh_index:
            return mesh_index[key]
        part = model.parts[part_key]
        pos, nrm, idx = render_arrays(part, model.has_brep)
        if len(idx) == 0:
            mesh_index[key] = None
            return None
        pv = add_view(pos.tobytes(), 34962)
        nv = add_view(nrm.tobytes(), 34962)
        iv = add_view(idx.tobytes(), 34963)
        prim = {
            "attributes": {
                "POSITION": add_accessor(pv, 5126, len(pos), "VEC3",
                                         min=pos.min(0).tolist(), max=pos.max(0).tolist()),
                "NORMAL": add_accessor(nv, 5126, len(nrm), "VEC3"),
            },
            "indices": add_accessor(iv, 5125, len(idx), "SCALAR"),
            "material": material_for(rgba),
        }
        gltf["meshes"].append({"name": part.name, "primitives": [prim]})
        mesh_index[key] = len(gltf["meshes"]) - 1
        return mesh_index[key]

    def add_node(node_id):
        node = model.nodes[node_id]
        entry = {"name": node.name, "extras": {"id": node.id}}
        if not np.allclose(node.local, np.eye(4)):
            entry["matrix"] = node.local.T.reshape(-1).tolist()  # glTF is column-major
        gltf["nodes"].append(entry)
        index = len(gltf["nodes"]) - 1
        if node.is_part:
            m = mesh_for(node.part_key, model.color_of(node_id))
            if m is not None:
                entry["mesh"] = m
        kids = [add_node(c) for c in node.children]
        if kids:
            entry["children"] = kids
        return index

    gltf["scenes"][0]["nodes"].append(add_node(model.root))
    while len(blob) % 4:
        blob.append(0)
    gltf["buffers"][0]["byteLength"] = len(blob)
    return gltf, bytes(blob)


def write_glb(model, path):
    gltf, blob = build_gltf(model)
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js += b" " * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack("<II", len(blob), 0x004E4942))
        f.write(blob)
    return path
