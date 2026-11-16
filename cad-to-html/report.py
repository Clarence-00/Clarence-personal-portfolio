"""Write report.md: summary, parts, interference, joints, warnings."""
from __future__ import annotations

import datetime as _dt
from pathlib import Path


def _n(v, d=2):
    if v is None:
        return "n/a"
    return f"{v:,.{d}f}"


def _vec(v, d=2):
    return "(" + ", ".join(f"{(x if abs(x) >= 0.5 * 10 ** -d else 0.0):.{d}f}" for x in v) + ")"


def write_report(path, *, model, tree, manifest, bom, summary, interferences, warnings, previews,
                 html_name, joint_source):
    s = tree["summary"]
    nodes = {n["id"]: n for n in tree["nodes"]}
    size = s["bbox"]["size"]
    lines = [
        f"# {model.name} — CAD report",
        "",
        f"Source: `{Path(model.source).name}` · generated {_dt.datetime.now():%Y-%m-%d %H:%M} · units: mm",
        "",
        "## Summary",
        "",
        "| | |",
        "|---|---|",
        f"| Part instances | {s['part_instances']} |",
        f"| Unique parts (BOM rows) | {len(bom)} |",
        f"| Overall dimensions (X × Y × Z) | {size[0]:.2f} × {size[1]:.2f} × {size[2]:.2f} mm |",
        f"| Bounding box | min {_vec(s['bbox']['min'])} · max {_vec(s['bbox']['max'])} mm |",
        f"| Total volume | {_n(summary['total_volume'], 1)} mm³ ({_n(summary['total_volume'] / 1000, 2)} cm³) |",
    ]
    if summary["total_mass"] is None:
        lines.append("| Total mass | n/a — no densities given (use `--density` or manifest materials) |")
    else:
        note = "" if summary["mass_complete"] else f" (partial: {summary['missing_mass']} part(s) without density)"
        lines.append(f"| Total mass | {_n(summary['total_mass'], 2)} g{note} |")
    lines += [
        f"| Center of mass | {_vec(summary['com'])} mm — weighted by {summary['com_basis']} |",
        f"| Viewer | [{html_name}]({html_name}) |",
        "",
    ]

    if previews:
        lines += ["## Previews", ""]
        lines += [f"![{p.stem}]({p.name})" for p in previews]
        lines.append("")

    lines += ["## Parts", "",
              "| # | Name | Qty | BBox (mm) | Volume (mm³) | Material | Unit mass (g) | Parent |",
              "|---|---|---|---|---|---|---|---|"]
    for r in bom:
        bb = f"{r['bbox_x_mm']:g} × {r['bbox_y_mm']:g} × {r['bbox_z_mm']:g}"
        lines.append(f"| {r['item']} | {r['name']} | {r['quantity']} | {bb} | {_n(r['volume_mm3'], 1)} | "
                     f"{r['material'] or '—'} | {_n(r['unit_mass_g'], 2)} | {r['parent_assembly']} |")
    lines.append("")

    lines += ["## Interference / overlap", ""]
    if interferences:
        lines += ["| Part A | Part B | Overlap volume (mm³) |", "|---|---|---|"]
        for i in interferences:
            lines.append(f"| {nodes[i['a']]['name']} (`{i['a']}`) | {nodes[i['b']]['name']} (`{i['b']}`) | "
                         f"{i['volume']:.3f} |")
    else:
        lines.append("None found (solids that only touch are not reported).")
    lines.append("")

    js = manifest.get("joints", [])
    lines += ["## Movable joints", "", f"Source: {joint_source}.", ""]
    if js:
        lines += ["| Id | Label | Type | Moves | Axis | Pivot | Range | Confidence |",
                  "|---|---|---|---|---|---|---|---|"]
        for j in js:
            unit = "mm" if j["type"] == "slider" else "°"
            moves = ", ".join(nodes[p]["name"] for p in j["part_ids"])
            pivot = _vec(j["pivot"]) if j.get("pivot") else "—"
            lines.append(f"| `{j['id']}` | {j.get('label', '')} | {j['type']} | {moves} | {_vec(j['axis'], 3)} | "
                         f"{pivot} | {j['min']:g} … {j['max']:g} {unit} | {j.get('confidence', '—')} |")
    else:
        lines.append("No joints defined.")
    if manifest.get("review_notes"):
        lines += ["", "Review notes:", ""] + [f"- {n}" for n in manifest["review_notes"]]
    lines.append("")

    lines += ["## Warnings", ""]
    lines += [f"- {w}" for w in warnings] if warnings else ["None."]
    lines += ["", "## Files", "",
              f"- `{html_name}` — interactive viewer (open by double-clicking; works offline)",
              "- `model.glb` — cleaned model (mm, Z-up) · `tree.json` — assembly hierarchy",
              "- `bom.csv`, `bom.xlsx` — bill of materials", "- `preview_*.png` — rendered views", ""]
    Path(path).write_text("\n".join(lines), encoding="utf-8")
