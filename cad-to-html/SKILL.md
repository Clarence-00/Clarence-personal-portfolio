---
name: cad-to-html
description: Turn a 3D CAD/mesh file (STEP/STP, IGES, STL, OBJ, GLB; parts or assemblies) into a self-contained interactive HTML viewer with working joints, plus BOM (csv/xlsx), preview PNGs, GLB, tree.json and a report. Use when the user says "use cad-to-html on <file>", or asks to make a model viewable/shareable in a browser, get a BOM, or check an assembly for interference.
---

# cad-to-html

`TOOL` below means the folder containing this SKILL.md (e.g. `./cad-to-html` in a repo, or
`~/.claude/skills/cad-to-html` when installed globally). Run commands from the user's project
folder so outputs land in `./out/<model-name>/`. Use the Python environment where
`TOOL/requirements.txt` is installed; if `import cadquery` fails, point the user to the Setup
section of `TOOL/README.md` instead of trying to fix it silently.

## Steps

1. **Convert + inspect**
   ```bash
   python TOOL/inspect_model.py path/to/model.step
   ```
   Writes `out/<name>/tree.json`, `model.glb` and `manifest.guess.json`, and prints the tree.
   Native CAD files (SLDPRT, IPT, F3D, ...) are rejected: tell the user to export STEP (AP214/AP242).
   For STL/OBJ/GLB in other units add `--units m|cm|in`.

2. **Read `out/<name>/tree.json`** (node ids, names, bboxes, volumes, `cylinders` per part)
   and `manifest.guess.json` (conservative guesses, all `confidence: "low"`, plus `review_notes`
   listing coaxial cylinders shared by parts).

3. **Write `out/<name>/manifest.json`** following `TOOL/manifest.schema.json`:
   - Joints: `id`, `label`, `type` (`hinge` | `slider` | `free`), `part_ids` (node ids; an
     assembly id moves all its parts), `axis`, `pivot` (hinge/free), `min`/`max` (deg or mm),
     `default`, `confidence`, `notes`. Coordinates are the assembly frame, mm.
   - Prefer evidence: a pin/hole coaxial between two parts gives the hinge axis and pivot (use
     the cylinder `origin`/`axis` from tree.json). The positive direction must open the part
     away from the rest of the model (right-hand rule about `axis`). Keep the guesser's sign
     unless you have a reason.
   - Nested joints work automatically: a joint whose parts include all of another joint's parts
     is its parent (e.g. hinge on `lid_assembly`, slider on `lid_assembly/latch`).
   - Set `confidence: "high"` for joints backed by clear geometry and names; leave `"low"` for
     ones the user has not confirmed (the viewer shows a "review" badge on those).
   - Add `materials` / `part_materials` only if the user gave materials or densities; never
     invent densities. Use `display.title` for a readable title.
   - Validate: `python TOOL/joints.py out/<name>/tree.json --check out/<name>/manifest.json`

4. **Ask only about the ambiguous joints**, in one AskUserQuestion call (max 4 questions), e.g.
   - which part moves when two parts share an axis and neither name says so,
   - slide direction/travel when there is no guide rod or rail geometry,
   - hinge range when nothing in the geometry bounds it (offer 90°, 110°, 180°).
   Do not ask about things the geometry already answers. If the user has no preference, keep
   your best guess with `confidence: "low"`.

5. **Build**
   ```bash
   python TOOL/build.py path/to/model.step --manifest out/<name>/manifest.json [--density 2.7]
   ```
   Add `--no-previews` only if no browser is available (Playwright/Chromium). If Playwright's
   Chromium is missing, run `python -m playwright install chromium` or set `C2H_CHROMIUM`.

6. **Summarize** for the user (keep it short):
   - path to `out/<name>/<name>.html` (double-click to open, works offline),
   - part count / unique parts, overall dimensions, total volume and mass (if densities given),
   - interferences found (from `report.md`), warnings worth acting on,
   - the joints and which ones are still `low` confidence,
   - show `preview_iso.png` and `preview_exploded_iso.png`.
