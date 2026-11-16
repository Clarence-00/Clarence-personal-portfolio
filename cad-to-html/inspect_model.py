"""Dump the assembly hierarchy to tree.json (+ model.glb and an auto-guessed manifest).

(Named inspect_model.py rather than inspect.py: a file called inspect.py next to the
scripts would shadow Python's standard `inspect` module and break numpy/scipy imports.)

CLI:
    python inspect_model.py path/to/model.step [--out out/<name>]

Writes into the output folder:
    tree.json             names, ids, parents, transforms, bboxes, volumes, cylinder features
    model.glb             cleaned GLB
    manifest.guess.json   conservative auto-guessed joints (confidence: low) for review
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

import analysis
from convert import ConversionError, load_model, UNIT_SCALE


def _hex(rgba):
    return "#%02x%02x%02x" % tuple(int(round(float(np.clip(v, 0, 1)) * 255)) for v in rgba[:3])


def _r(v, nd=4):
    """Round numbers / arrays for readable JSON."""
    if v is None:
        return None
    if isinstance(v, (list, tuple, np.ndarray)):
        return [_r(x, nd) for x in np.asarray(v, float).tolist()]
    v = round(float(v), nd)
    return 0.0 if v == 0 else v


def build_tree(model, props, instances):
    by_id = {i.id: i for i in instances}
    lo, hi = analysis.overall_bbox(instances)
    nodes = []
    bbox_cache = {}

    def subtree_bbox(nid):
        if nid in bbox_cache:
            return bbox_cache[nid]
        node = model.nodes[nid]
        if node.is_part:
            inst = by_id[nid]
            res = (inst.bbox_min, inst.bbox_max, inst.volume or 0.0)
        else:
            parts = [subtree_bbox(c) for c in node.children]
            if parts:
                res = (np.min([p[0] for p in parts], 0), np.max([p[1] for p in parts], 0),
                       sum(p[2] for p in parts))
            else:
                res = (np.zeros(3), np.zeros(3), 0.0)
        bbox_cache[nid] = res
        return res

    for nid, node in model.nodes.items():
        bmin, bmax, vol = subtree_bbox(nid)
        entry = {
            "id": nid,
            "name": node.name,
            "type": "part" if node.is_part else "assembly",
            "parent": node.parent,
            "children": list(node.children),
            "transform": _r(node.local),          # 4x4 row-major, relative to parent
            "world_transform": _r(model.world(nid)),
            "bbox": {"min": _r(bmin, 3), "max": _r(bmax, 3), "size": _r(bmax - bmin, 3),
                     "center": _r((bmin + bmax) / 2, 3)},
            "volume_mm3": _r(vol, 3) if vol else None,
        }
        if node.is_part:
            inst, p, part = by_id[nid], props[node.part_key], model.parts[node.part_key]
            entry.update({
                "part_name": part.name,
                "part_key": node.part_key,
                "geometry_hash": p.geometry_hash,
                "color": _hex(model.color_of(nid)),
                "com": _r(inst.com, 3),
                "triangles": int(len(part.mesh.faces)),
                "cylinders": [{"origin": _r(c["origin"], 3), "axis": _r(c["axis"], 4),
                               "radius": _r(c["radius"], 3), "length": _r(c["length"], 3)}
                              for c in inst.cylinders],
            })
        nodes.append(entry)

    return {
        "model": model.name,
        "source": Path(model.source).name,
        "units": "mm",
        "up": "z",
        "root": model.root,
        "summary": {
            "part_instances": len(instances),
            "unique_parts": len({props[i.part_key].geometry_hash for i in instances}),
            "bbox": {"min": _r(lo, 3), "max": _r(hi, 3), "size": _r(hi - lo, 3)},
            "total_volume_mm3": _r(sum(i.volume or 0 for i in instances), 3),
        },
        "nodes": nodes,
    }


def main(argv=None):
    import joints
    from glb_writer import write_glb
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--out", help="output folder (default: out/<model-name>)")
    ap.add_argument("--tolerance", type=float, help="linear tessellation tolerance in mm (default: auto)")
    ap.add_argument("--units", default="mm", choices=UNIT_SCALE, help="units of mesh inputs (STL/OBJ/GLB)")
    args = ap.parse_args(argv)
    try:
        model = load_model(args.input, args.tolerance, units=args.units)
    except ConversionError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    out = Path(args.out or Path("out") / model.name)
    out.mkdir(parents=True, exist_ok=True)

    props, instances = analysis.analyze(model)
    tree = build_tree(model, props, instances)
    (out / "tree.json").write_text(json.dumps(tree, indent=1))
    write_glb(model, out / "model.glb")
    guess = joints.guess_manifest(tree)
    (out / "manifest.guess.json").write_text(json.dumps(guess, indent=2))

    print(f"wrote {out / 'tree.json'}, {out / 'model.glb'}, {out / 'manifest.guess.json'}")
    print_tree(tree)
    print(f"auto-guessed joints: {len(guess['joints'])} (all confidence: low, review before use)")
    for w in model.warnings:
        print(f"warning: {w}")
    return 0


def print_tree(tree):
    nodes = {n["id"]: n for n in tree["nodes"]}

    def show(nid, depth):
        n = nodes[nid]
        size = " x ".join(f"{v:g}" for v in n["bbox"]["size"])
        extra = f"  [{n['geometry_hash']}]" if n["type"] == "part" else ""
        print(f"{'  ' * depth}- {n['name']}  ({n['type']}, {size} mm){extra}")
        for c in n["children"]:
            show(c, depth + 1)
    show(tree["root"], 0)


if __name__ == "__main__":
    sys.exit(main())
