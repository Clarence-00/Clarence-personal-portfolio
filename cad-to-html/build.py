"""cad-to-html: turn a 3D model into a self-contained interactive HTML viewer + BOM + report.

Usage:
    python build.py path/to/model.step [--manifest m.json] [--density 2.7] [--out out/<name>]

Outputs in out/<model-name>/:
    <name>.html            single-file viewer (three.js + GLB inlined, works offline)
    model.glb, tree.json   cleaned model and assembly hierarchy
    bom.csv, bom.xlsx      one row per unique part
    preview_*.png          iso, front, top, right, exploded iso
    report.md              dimensions, mass, interference, joints, warnings
    manifest.guess.json    (only without --manifest) auto-guessed joints for review
"""
from __future__ import annotations

import argparse
import base64
import fnmatch
import html
import json
import re
import shutil
import sys
import time
from pathlib import Path

import analysis
import joints
import report
from convert import ConversionError, UNIT_SCALE, load_model
from glb_writer import write_glb
from inspect_model import build_tree

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE / "viewer" / "viewer.html"
VIEWER_JS = HERE / "viewer" / "viewer.js"
THREE_JS = HERE / "vendor" / "three.bundle.min.js"


def parse_args(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", help="STEP/STP, IGES/IGS, STL, OBJ or GLB file")
    ap.add_argument("--manifest", help="manifest.json with joints/materials/display options")
    ap.add_argument("--density", type=float, help="default density in g/cm^3 for parts without a material")
    ap.add_argument("--out", help="output folder (default: out/<model-name>)")
    ap.add_argument("--title", help="viewer title (default: manifest display.title or model name)")
    ap.add_argument("--tolerance", type=float, help="linear tessellation tolerance in mm (default: auto)")
    ap.add_argument("--units", default="mm", choices=UNIT_SCALE, help="units of mesh inputs (STL/OBJ/GLB)")
    ap.add_argument("--no-previews", action="store_true", help="skip PNG rendering (no browser needed)")
    ap.add_argument("--chromium", help="path to a Chromium/Chrome binary for previews (or set C2H_CHROMIUM)")
    return ap.parse_args(argv)


def safe_name(name):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_") or "model"


def apply_color_overrides(model, manifest):
    """display.part_colors and materials[*].color -> instance colours (baked into the GLB)."""
    def hex_to_rgba(h):
        return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)) + (1.0,)

    rules = list((manifest.get("display", {}).get("part_colors") or {}).items())
    mats = manifest.get("materials", {})
    for pattern, mat in (manifest.get("part_materials") or {}).items():
        if mats.get(mat, {}).get("color"):
            rules.append((pattern, mats[mat]["color"]))
    for nid in model.leaves():
        node = model.nodes[nid]
        names = (nid, node.name, model.parts[node.part_key].name)
        for pattern, color in rules:
            in_assembly = pattern in model.nodes and nid.startswith(pattern + "/")
            if in_assembly or any(fnmatch.fnmatchcase(s, pattern) for s in names):
                node.color = hex_to_rgba(color)
                break


def viewer_data(tree, manifest, title, summary):
    keep = ("id", "name", "type", "parent", "children", "bbox", "volume_mm3", "color",
            "part_name", "material", "mass_g")
    joint_keys = ("id", "label", "type", "axis", "pivot", "min", "max", "default", "confidence",
                  "notes", "leaves", "part_ids")
    return {
        "title": title, "model": tree["model"], "units": "mm",
        "summary": tree["summary"] | {"total_mass_g": summary["total_mass"]},
        "tree": {"root": tree["root"], "nodes": [{k: n.get(k) for k in keep} for n in tree["nodes"]]},
        "joints": [{k: j[k] for k in joint_keys if k in j} for j in joints.ordered_joints(manifest)],
        "display": manifest.get("display", {}),
    }


def build_html(data, glb_bytes, title):
    def js_safe(text):
        return text.replace("</script", "<\\/script")

    model_json = json.dumps(data, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\!--")
    values = {
        "TITLE": html.escape(title),
        "MODEL_DATA": model_json,
        "GLB_BASE64": base64.b64encode(glb_bytes).decode("ascii"),
        "THREE_JS": js_safe(THREE_JS.read_text(encoding="utf-8")),
        "VIEWER_JS": js_safe(VIEWER_JS.read_text(encoding="utf-8")),
    }
    template = TEMPLATE.read_text(encoding="utf-8")
    # One pass, so inserted content can never be mistaken for another placeholder.
    pattern = re.compile(r"/\*__(THREE_JS|VIEWER_JS)__\*/|__(TITLE|MODEL_DATA|GLB_BASE64)__")
    return pattern.sub(lambda m: values[m.group(1) or m.group(2)], template)


def main(argv=None):
    args = parse_args(argv)
    t0 = time.time()
    try:
        model = load_model(args.input, args.tolerance, units=args.units)
    except ConversionError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    name = safe_name(model.name)
    out = Path(args.out or Path("out") / name)
    out.mkdir(parents=True, exist_ok=True)
    print(f"[1/6] loaded {Path(args.input).name}: {len(model.leaves())} part instances, "
          f"{len(model.parts)} unique meshes")

    props, instances = analysis.analyze(model)
    tree = build_tree(model, props, instances)

    warnings = list(model.warnings)
    if args.manifest:
        try:
            manifest, mwarn = joints.load_manifest(args.manifest, tree)
        except (joints.ManifestError, json.JSONDecodeError) as exc:
            print(f"ERROR in {args.manifest}: {exc}", file=sys.stderr)
            return 3
        target = out / "manifest.json"
        if Path(args.manifest).resolve() != target.resolve():
            shutil.copyfile(args.manifest, target)
        joint_source = "manifest"
    else:
        guess = joints.guess_manifest(tree)
        (out / "manifest.guess.json").write_text(json.dumps(guess, indent=2))
        manifest, mwarn = joints.load_manifest(guess, tree)
        if guess["joints"]:
            mwarn = [f"No --manifest given: {len(guess['joints'])} joint(s) auto-guessed (confidence: low). "
                     f"Review {out / 'manifest.guess.json'} and pass it with --manifest."]
        else:
            mwarn = ["No --manifest given and no joints could be guessed from part names "
                     f"(see {out / 'manifest.guess.json'})."]
        joint_source = "auto-guess"
    warnings += mwarn
    print(f"[2/6] joints: {len(manifest.get('joints', []))} ({joint_source})")

    analysis.assign_materials(model, instances, manifest, args.density)
    apply_color_overrides(model, manifest)
    summary = analysis.mass_summary(instances)
    interferences = analysis.find_interferences(model, props, instances, warnings)
    warnings += analysis.geometry_warnings(model, props, instances)
    bom = analysis.build_bom(model, props, instances)
    print(f"[3/6] analysis: {len(bom)} BOM rows, {len(interferences)} interference(s)")

    # Final tree (colours may have changed) + per-node material/mass for the viewer.
    tree = build_tree(model, props, instances)
    by_id = {i.id: i for i in instances}
    for n in tree["nodes"]:
        leaves = [by_id[l] for l in model.leaves(n["id"])]
        masses = [i.mass for i in leaves]
        n["mass_g"] = round(sum(masses), 3) if masses and None not in masses else None
        if n["type"] == "part":
            n["material"] = by_id[n["id"]].material
    (out / "tree.json").write_text(json.dumps(tree, indent=1))
    glb_path = write_glb(model, out / "model.glb")
    analysis.write_bom_csv(bom, out / "bom.csv")
    analysis.write_bom_xlsx(bom, out / "bom.xlsx", model.name)

    title = args.title or manifest.get("display", {}).get("title") or model.name
    html_path = out / f"{name}.html"
    html_path.write_text(build_html(viewer_data(tree, manifest, title, summary),
                                    glb_path.read_bytes(), title), encoding="utf-8")
    print(f"[4/6] wrote {html_path} ({html_path.stat().st_size / 1e6:.1f} MB)")

    previews, console_errors = [], []
    if args.no_previews:
        print("[5/6] previews skipped (--no-previews)")
    else:
        import render
        try:
            previews, console_errors = render.render_previews(html_path, out, args.chromium)
            print(f"[5/6] rendered {len(previews)} previews")
        except render.RenderError as exc:
            warnings.append(f"Previews not rendered: {exc}")
            print(f"[5/6] WARNING: {exc}", file=sys.stderr)
        for e in console_errors:
            warnings.append(f"Viewer console error: {e}")

    report.write_report(out / "report.md", model=model, tree=tree, manifest=manifest, bom=bom,
                        summary=summary, interferences=interferences, warnings=warnings,
                        previews=previews, html_name=html_path.name, joint_source=joint_source)
    print(f"[6/6] wrote {out / 'report.md'}  -  done in {time.time() - t0:.1f}s")
    for w in warnings:
        print(f"  warning: {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
