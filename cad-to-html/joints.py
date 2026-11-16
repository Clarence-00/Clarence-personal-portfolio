"""Manifest loading/validation and conservative joint auto-guessing (from tree.json).

Guessing rules (deliberately simple; every guess is marked confidence "low"):
  * Only nodes whose NAME hints at motion become joints:
        hinge  : lid, door, flap, hatch, cover, arm, lever, gate, visor, hinge
        slider : slide(r), drawer, carriage, latch, plunger, piston, tray, shuttle, sled
        free   : wheel, knob, dial, rotor, fan, propeller, pulley, gear, roller, crank, spinner
    Names that suggest fixed hardware (pin, axle, bolt, screw, base, frame, ...) are skipped.
  * Axis: a cylindrical face of the moving part that is coaxial with a cylinder on another
    part (pin in hole, knuckles) is taken as the axis. Otherwise a bounding-box fallback.
  * Hinge direction: the sign that moves the part away from the rest of the model.
  * Coaxial cylinders shared by parts with no motion hint are listed in review_notes only.

CLI:
    python joints.py out/<name>/tree.json [-o manifest.guess.json]
    python joints.py out/<name>/tree.json --check manifest.json     # validate a manifest
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np

SCHEMA_PATH = Path(__file__).with_name("manifest.schema.json")

KEYWORDS = {
    "hinge": ["lid", "door", "flap", "hatch", "cover", "arm", "lever", "gate", "visor", "hinge"],
    "slider": ["slide", "slider", "drawer", "carriage", "latch", "plunger", "piston", "tray",
               "shuttle", "sled"],
    "free": ["wheel", "knob", "dial", "rotor", "fan", "propeller", "pulley", "gear", "roller",
             "crank", "spinner"],
}
FIXED_WORDS = ["pin", "axle", "bolt", "screw", "nut", "washer", "bushing", "bearing", "base",
               "frame", "housing", "body", "chassis", "bracket", "mount", "rail"]


class ManifestError(Exception):
    pass


# ---------------------------------------------------------------------------
# Tree helpers
# ---------------------------------------------------------------------------
def node_map(tree):
    return {n["id"]: n for n in tree["nodes"]}


def leaves_under(nodes, nid):
    n = nodes[nid]
    if n["type"] == "part":
        return [nid]
    out = []
    for c in n["children"]:
        out.extend(leaves_under(nodes, c))
    return out


def ancestors(nodes, nid):
    out, p = [], nodes[nid]["parent"]
    while p is not None:
        out.append(p)
        p = nodes[p]["parent"]
    return out


def words(name):
    name = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    return [w for w in re.split(r"[^a-z]+", name.lower()) if w]


def classify(name):
    ws = words(name)
    if any(w in FIXED_WORDS or w.rstrip("s") in FIXED_WORDS for w in ws):
        return None
    for jtype, keys in KEYWORDS.items():
        if any(w in keys or w.rstrip("s") in keys for w in ws):
            return jtype
    return None


def resolve_refs(refs, tree, what):
    """Map ids-or-names to node ids. Raises ManifestError for unknown references."""
    nodes = node_map(tree)
    out = []
    for ref in refs:
        if ref in nodes:
            hits = [ref]
        else:
            hits = [n["id"] for n in tree["nodes"] if ref in (n["name"], n.get("part_name"))]
        if not hits:
            sample = ", ".join(list(nodes)[:12])
            raise ManifestError(f"{what}: unknown part '{ref}'. Use a tree.json node id or name "
                                f"(e.g. {sample}).")
        out.extend(h for h in hits if h not in out)
    return out


# ---------------------------------------------------------------------------
# Auto-guess
# ---------------------------------------------------------------------------
def _vec(v, nd=4):
    return [round(float(x), nd) + 0.0 for x in v]  # + 0.0 turns -0.0 into 0.0


def _unit(v):
    v = np.asarray(v, float)
    return v / (np.linalg.norm(v) or 1.0)


def _coincide(c1, c2, tol):
    d1, d2 = _unit(c1["axis"]), _unit(c2["axis"])
    if abs(abs(float(d1 @ d2)) - 1) > 1e-3:
        return False
    off = np.asarray(c2["origin"]) - np.asarray(c1["origin"])
    return float(np.linalg.norm(off - (off @ d1) * d1)) < tol


def _rotate(p, pivot, axis, deg):
    """Rodrigues rotation of point p about the line (pivot, axis)."""
    k, v = _unit(axis), np.asarray(p, float) - pivot
    t = np.radians(deg)
    return pivot + v * np.cos(t) + np.cross(k, v) * np.sin(t) + k * (k @ v) * (1 - np.cos(t))


def _bbox_of(nodes, ids):
    lo = np.min([nodes[i]["bbox"]["min"] for i in ids], 0)
    hi = np.max([nodes[i]["bbox"]["max"] for i in ids], 0)
    return lo, hi


def _shared_axis(nodes, moving, others, tol):
    """Best cylinder axis of the moving parts that is coaxial with cylinders on other parts."""
    best = None
    for mid in moving:
        for c in nodes[mid]["cylinders"]:
            sharers = {oid for oid in others for oc in nodes[oid]["cylinders"] if _coincide(c, oc, tol)}
            if not sharers:
                continue
            score = (len(sharers), c["radius"] * c["length"])
            if best is None or score > best[0]:
                best = (score, c, sorted(sharers))
    return best


def guess_joint(tree, nid, jtype):
    nodes = node_map(tree)
    all_leaves = leaves_under(nodes, tree["root"])
    moving = leaves_under(nodes, nid)
    others = [l for l in all_leaves if l not in moving]
    lo, hi = _bbox_of(nodes, moving)
    centre = (lo + hi) / 2
    rest_centre = np.mean(_bbox_of(nodes, others), 0) if others else centre
    size = float(np.linalg.norm(np.asarray(tree["summary"]["bbox"]["size"])))
    tol = max(0.05, 0.005 * size)

    name = nodes[nid]["name"]
    found = _shared_axis(nodes, moving, others, tol)
    if found:
        _, cyl, sharers = found
        axis, point = _unit(cyl["axis"]), np.asarray(cyl["origin"], float)
        names = ", ".join(nodes[s]["name"] for s in sharers)
        evidence = f"axis from a cylinder (r={cyl['radius']:g} mm) coaxial with: {names}"
    else:
        axis, point, evidence = _fallback_axis(jtype, lo, hi, rest_centre, nodes, moving)

    pivot = point + ((centre - point) @ axis) * axis   # point on the axis nearest the part
    joint = {"id": re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_") + f"_{jtype}",
             "label": f"{name.replace('_', ' ')} ({jtype})", "type": jtype, "part_ids": [nid],
             "axis": _vec(axis), "confidence": "low"}

    if jtype in ("hinge", "free"):
        joint["pivot"] = _vec(pivot, 3)
    if jtype == "hinge":
        before = np.linalg.norm(centre - rest_centre)
        after = np.linalg.norm(_rotate(centre, pivot, axis, 20) - rest_centre)
        if after < before:
            joint["axis"] = _vec(-axis)
        joint.update({"min": 0, "max": 90, "default": 0})
        evidence += "; opening direction = away from the rest of the model; range 0-90 deg is a guess"
    elif jtype == "slider":
        extent = float((hi - lo) @ np.abs(axis))
        if (centre - rest_centre) @ axis < 0:
            joint["axis"] = _vec(-axis)
        joint.update({"min": 0, "max": round(max(1.0, 0.5 * extent), 2), "default": 0})
        evidence += "; travel = half the part length (guess)"
    else:
        joint.update({"min": -180, "max": 180, "default": 0})
    joint["notes"] = f"Auto-guessed from the name '{name}'; {evidence}."
    return joint


def _fallback_axis(jtype, lo, hi, rest_centre, nodes, moving):
    size = hi - lo
    centre = (lo + hi) / 2
    if jtype == "free":
        cyls = [c for m in moving for c in nodes[m]["cylinders"]]
        if cyls:
            c = max(cyls, key=lambda c: c["radius"])
            return _unit(c["axis"]), np.asarray(c["origin"], float), "axis from the part's largest cylinder"
        k = int(np.argmin(size))
        return np.eye(3)[k], centre, "axis = thinnest bounding-box direction (no cylinders found)"
    if jtype == "slider":
        k = int(np.argmax(size))
        return np.eye(3)[k], centre, "axis = longest bounding-box direction (no guide rod found)"
    # hinge: longest horizontal bbox edge, on the side nearest the rest of the model
    k = int(np.argmax(size[:2]))
    a, b = [i for i in range(3) if i != k]
    best = None
    for va in (lo[a], hi[a]):
        for vb in (lo[b], hi[b]):
            p = centre.copy()
            p[a], p[b] = va, vb
            d = np.linalg.norm(np.delete(p - rest_centre, k))
            if best is None or d < best[0]:
                best = (d, p)
    return np.eye(3)[k], best[1], "no pin/hole found; axis guessed from a bounding-box edge - verify"


def guess_manifest(tree):
    nodes = node_map(tree)
    candidates = {}
    for n in tree["nodes"]:
        if n["id"] == tree["root"]:
            continue
        jtype = classify(n["name"]) or (classify(n.get("part_name", "")) if n["type"] == "part" else None)
        if jtype:
            candidates[n["id"]] = jtype
    # Moving an assembly moves its children, so drop children of a same-type candidate.
    chosen = {nid: t for nid, t in candidates.items()
              if not any(candidates.get(a) == t for a in ancestors(nodes, nid))}
    joint_list = [guess_joint(tree, nid, t) for nid, t in chosen.items()]

    notes = []
    moving_leaves = {l for nid in chosen for l in leaves_under(nodes, nid)}
    leaves = [l for l in leaves_under(nodes, tree["root"]) if l not in moving_leaves]
    size = float(np.linalg.norm(np.asarray(tree["summary"]["bbox"]["size"])))
    tol = max(0.05, 0.005 * size)
    lines = []  # [(cylinder, [leaf ids sharing its axis line])]
    for leaf in leaves:
        for c in nodes[leaf]["cylinders"]:
            for cyl, members in lines:
                if _coincide(cyl, c, tol):
                    if leaf not in members:
                        members.append(leaf)
                    break
            else:
                lines.append((c, [leaf]))
    for cyl, members in lines:
        if len(members) > 1 and len(notes) < 10:
            names = ", ".join(f"'{nodes[m]['name']}'" for m in members)
            notes.append(f"{names} share a cylindrical axis (through {cyl['origin']}, direction "
                         f"{cyl['axis']}) - possible pivot; no joint created because no name suggests motion.")
    if not joint_list:
        notes.append("No part names suggested motion; no joints were guessed.")
    return {"$schema": "manifest.schema.json", "model": tree["model"], "units": "mm",
            "joints": joint_list, "materials": {}, "part_materials": {},
            "display": {"background": "light", "up": tree.get("up", "z"), "show_axes": True,
                        "edges": True, "explode_scale": 1.0},
            "review_notes": notes}


# ---------------------------------------------------------------------------
# Loading / validation
# ---------------------------------------------------------------------------
def validate_schema(manifest):
    try:
        import jsonschema
    except ImportError:
        return ["jsonschema not installed; skipped schema validation (pip install jsonschema)."]
    schema = json.loads(SCHEMA_PATH.read_text())
    errors = sorted(jsonschema.Draft202012Validator(schema).iter_errors(manifest), key=lambda e: list(e.path))
    if errors:
        msgs = [f"  at {'/'.join(map(str, e.path)) or '(root)'}: {e.message}" for e in errors[:10]]
        raise ManifestError("manifest does not match manifest.schema.json:\n" + "\n".join(msgs))
    return []


def load_manifest(source, tree):
    """Load (path or dict), validate, and resolve part references. Returns (manifest, warnings)."""
    manifest = json.loads(Path(source).read_text()) if not isinstance(source, dict) else dict(source)
    warnings = validate_schema(manifest)
    nodes = node_map(tree)
    seen = set()
    for j in manifest.get("joints", []):
        if j["id"] in seen:
            raise ManifestError(f"duplicate joint id '{j['id']}'")
        seen.add(j["id"])
        j["part_ids"] = resolve_refs(j["part_ids"], tree, f"joint '{j['id']}'")
        if np.linalg.norm(j["axis"]) < 1e-9:
            raise ManifestError(f"joint '{j['id']}': axis must be non-zero")
        lo, hi = j.get("min", -180 if j["type"] == "free" else 0), j.get("max", 180 if j["type"] == "free" else 0)
        if lo > hi:
            raise ManifestError(f"joint '{j['id']}': min ({lo}) > max ({hi})")
        j["min"], j["max"] = lo, hi
        d = j.get("default", 0 if lo <= 0 <= hi else lo)
        if not lo <= d <= hi and j["type"] != "free":
            warnings.append(f"joint '{j['id']}': default {d} outside [{lo}, {hi}], clamped.")
            d = min(max(d, lo), hi)
        j["default"] = d
        j["leaves"] = sorted({l for p in j["part_ids"] for l in leaves_under(nodes, p)})
        if j["type"] == "slider":
            j.pop("pivot", None)
        if j.get("confidence") == "low":
            warnings.append(f"joint '{j['id']}' is marked confidence: low (auto-guessed) - please review.")
    display = manifest.setdefault("display", {})
    if display.get("hidden_parts"):
        display["hidden_parts"] = resolve_refs(display["hidden_parts"], tree, "display.hidden_parts")
    return manifest, warnings


def ordered_joints(manifest):
    """Outer joints first: a joint moving more parts is applied 'outside' one moving a subset."""
    js = list(manifest.get("joints", []))
    return sorted(js, key=lambda j: -len(j["leaves"]))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tree")
    ap.add_argument("-o", "--output", help="write guessed manifest here (default: stdout)")
    ap.add_argument("--check", metavar="MANIFEST", help="validate this manifest against the tree")
    args = ap.parse_args(argv)
    tree = json.loads(Path(args.tree).read_text())
    if args.check:
        try:
            m, warnings = load_manifest(args.check, tree)
        except ManifestError as exc:
            print(f"INVALID: {exc}", file=sys.stderr)
            return 1
        print(f"OK: {len(m.get('joints', []))} joint(s)")
        for w in warnings:
            print(f"warning: {w}")
        return 0
    text = json.dumps(guess_manifest(tree), indent=2)
    if args.output:
        Path(args.output).write_text(text)
        print(f"wrote {args.output}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
