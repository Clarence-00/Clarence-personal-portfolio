# cad-to-html

Turn a 3D model (STEP/STP, IGES, STL, OBJ, GLB; single parts or assemblies) into a bundle in
`out/<model-name>/`:

| File | What it is |
|---|---|
| `<name>.html` | One self-contained interactive viewer. three.js and the GLB are inlined; double-click to open, works offline. |
| `bom.csv`, `bom.xlsx` | One row per unique part (identical geometry de-duplicated by a geometry hash): item, name, qty, bbox, volume, material, mass, parent assembly. |
| `preview_iso.png`, `_front`, `_top`, `_right`, `_exploded_iso` | Headless renders of the viewer. |
| `model.glb` | Cleaned GLB (mm, Z-up, one node per tree node, instances share meshes). |
| `tree.json` | Assembly hierarchy: ids, names, transforms, bboxes, volumes, cylinder features. |
| `report.md` | Part count, overall dimensions, total volume/mass, centre of mass, interference list, joints, warnings. |
| `manifest.json` / `manifest.guess.json` | The manifest used, or (without `--manifest`) the auto-guessed one to review. |

## Setup

Python 3.10–3.13. Everything installs from pip on macOS (Intel and Apple Silicon), Windows and
Linux. **Conda is not required**: `cadquery` ships pip wheels that include OpenCascade
(`cadquery-ocp`). Use the conda route only if the pip install fails on your Python version.

**macOS / Linux**
```bash
cd cad-to-html
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium        # browser used for the preview PNGs
```

**Windows (PowerShell)**
```powershell
cd cad-to-html
py -3.12 -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m playwright install chromium
```

**Conda alternative**: `conda env create -f environment.yml && conda activate cad-to-html`,
then `python -m playwright install chromium`.

If you already have Chrome/Chromium and don't want Playwright's download, set
`C2H_CHROMIUM=/path/to/chrome` (or pass `--chromium`). Without any browser, use `--no-previews`;
everything else still works.

### Quick test (sample hinged box)

```bash
python cad-to-html/tests/test_end_to_end.py
```

This builds a 3-part hinged box in CadQuery (base, lid sub-assembly with a sliding latch,
two identical hinge pins), runs the whole pipeline, then opens the HTML in headless Chromium and
checks: no console errors, joint limits enforced, the latch rides along with the lid, measure,
section, explode and every toolbar button work, and interference is detected for overlapping
parts (OCC boolean for STEP, mesh boolean for GLB). Outputs land in `out/_test/`.

To build the sample yourself and open it:

```bash
python cad-to-html/samples/make_sample.py out/samples/hinged_box.step
python cad-to-html/build.py out/samples/hinged_box.step --manifest cad-to-html/samples/hinged_box.manifest.json
open out/hinged_box/hinged_box.html        # Windows: start out\hinged_box\hinged_box.html
```

## Usage

```bash
python cad-to-html/build.py path/to/model.step [--manifest m.json] [--density 2.7] [--out DIR]
```

Options: `--title`, `--tolerance MM` (tessellation chord tolerance, default auto = 0.2% of each
part's size), `--units mm|cm|m|in|ft` (for STL/OBJ/GLB, which carry no units; glTF is usually
metres), `--no-previews`, `--chromium PATH`.

The pieces can also be run separately:

```bash
python cad-to-html/convert.py model.step -o model.glb          # just the GLB
python cad-to-html/inspect_model.py model.step                 # tree.json + GLB + manifest.guess.json
python cad-to-html/joints.py out/x/tree.json --check out/x/manifest.json   # validate a manifest
```

Native CAD files (`.sldprt`, `.ipt`, `.f3d`, `.catpart`, `.prt`, ...) are rejected with a message
asking for a STEP export (AP214 or AP242 keeps names and colours).

### As a Claude Code skill

Copy (or symlink) this folder to `~/.claude/skills/cad-to-html/` (or `<project>/.claude/skills/`),
then say *"use cad-to-html on path/to/model.step"*. Claude runs convert + inspect, reads
`tree.json`, writes `manifest.json` with sensible joints, asks only about ambiguous ones, runs
`build.py` and summarizes. See [SKILL.md](SKILL.md).

## Viewer

- Orbit (drag), pan (right-drag or Shift-drag), zoom (wheel); auto-fit; Iso/Front/Top/Right
  views; Reset (R), Fit (F).
- Part tree: show/hide checkboxes, ◎ isolate, click to select (also by clicking in 3D). The
  selection panel shows name, id, bbox, volume, material/mass and a per-part opacity slider.
- Explode slider (each part moves along the vector from the assembly centre).
- Section plane: X/Y/Z axis, position slider, flip.
- Edges, wireframe, axes helper, light/dark background.
- Joint sliders from the manifest with limits enforced; nested joints compose.
- Measure (M): click two points to get the distance and ΔX/ΔY/ΔZ.
- Screenshot button downloads a PNG.

Scripts can drive it through `window.c2h` (`setView`, `setJoint`, `setExplode`, `setSection`,
`select`, `measure`, `capture`, ...); `render.py` and the tests use this.

## Manifest format

JSON, validated against [`manifest.schema.json`](manifest.schema.json). Coordinates are in the
model's assembly frame at rest, in millimetres. Parts are referenced by `tree.json` node id
(e.g. `hinged_box/lid_assembly`) or by name.

```json
{
  "model": "hinged_box",
  "units": "mm",
  "joints": [
    {"id": "lid_hinge", "label": "Lid hinge", "type": "hinge",
     "part_ids": ["hinged_box/lid_assembly"],
     "axis": [-1, 0, 0], "pivot": [0, 34, 40], "min": 0, "max": 110, "default": 0,
     "confidence": "high"},
    {"id": "latch_slide", "label": "Latch", "type": "slider", "part_ids": ["latch"],
     "axis": [0, -1, 0], "min": 0, "max": 8}
  ],
  "materials": {"ABS": {"density": 1.05}, "steel": {"density": 7.85, "color": "#a9adb3"}},
  "part_materials": {"hinge_pin*": "steel", "*": "ABS"},
  "default_density": 1.0,
  "display": {"title": "Hinged box", "background": "light", "up": "z", "show_axes": true,
              "edges": true, "explode_scale": 1.0, "hidden_parts": [], "part_colors": {"latch": "#cc3333"}}
}
```

| Field | Meaning |
|---|---|
| `joints[].type` | `hinge`: rotation about `axis` through `pivot`, degrees, limited to `min`..`max`. `slider`: translation along `axis`, mm. `free`: rotation without meaningful stops (defaults to −180..180). |
| `joints[].part_ids` | Nodes that move together. An assembly id moves all its parts. |
| `joints[].axis` | Direction (any length). Positive values rotate right-handed about it / move along it. |
| nesting | A joint whose parts include all of another joint's parts is its parent, so the child's axis rides along (the latch slides along the opened lid). |
| `joints[].confidence` | `low` = auto-guessed / unconfirmed; the viewer shows a "review" badge. |
| `materials` | name → `density` in g/cm³ (aluminium 2.7, steel 7.85, ABS 1.05, PLA 1.24), optional display `color`. |
| `part_materials` | node id / node name / part name (globs, or an assembly id) → material. First match wins. |
| `default_density` | Density for parts with no material. `--density` on the command line overrides it. |
| `display` | `title`, `background` (light/dark), `up` (z/y), `show_axes`, `edges`, `explode_scale`, `hidden_parts`, `part_colors`. |
| `review_notes` | Free text for humans; ignored by the viewer. |

### Joint auto-guessing

Without `--manifest`, `build.py` (and `inspect_model.py`) writes `manifest.guess.json`, using
deliberately conservative rules and marking every joint `"confidence": "low"`:

- Only parts or assemblies whose **name** suggests motion become joints: hinge (lid, door, flap,
  hatch, cover, arm, lever, gate, visor), slider (slide, drawer, carriage, latch, plunger,
  piston, tray), free (wheel, knob, dial, rotor, fan, pulley, gear, roller, crank). Names that
  suggest fixed hardware (pin, axle, bolt, screw, base, frame, housing, ...) are skipped.
- The axis comes from a cylindrical face of the moving part that is coaxial with a cylinder on
  another part (pin in a hole, hinge knuckles). Otherwise a bounding-box fallback is used and
  the note says so.
- Hinges open in the direction that moves the part away from the rest of the model, 0–90°.
  Sliders get half the part's length as travel.
- Coaxial cylinders between parts with no motion hint are listed in `review_notes`, not turned
  into joints.

## How it works

| File | Role |
|---|---|
| `convert.py` | Loads STEP/IGES with OCP's XCAF reader (assembly tree, names, colours, instance transforms; prototypes tessellated once) and meshes with trimesh. |
| `glb_writer.py` | Small GLB writer: one glTF node per tree node with `extras.id`, shared meshes for instances. |
| `analysis.py` | Volumes/COM/inertia (exact B-rep via OCC; mesh otherwise), placement-independent geometry hash, cylinder features, interference (OCC boolean or manifold3d), materials and mass, BOM. |
| `inspect_model.py` | Builds `tree.json`. (Not named `inspect.py` because that would shadow Python's standard `inspect` module.) |
| `joints.py` | Manifest validation and joint auto-guessing. |
| `build.py` | Ties it together and fills `viewer/viewer.html` (+ `viewer/viewer.js`, `vendor/three.bundle.min.js`). |
| `render.py` | Opens the HTML in headless Chromium (software WebGL) and captures the preview PNGs. |
| `report.py` | Writes `report.md`. |

## Limitations

- Mirror-image parts have the same geometry hash, so they share a BOM row (they have the same
  volume and inertia).
- The section view has no solid caps; the cut is shown open.
- Interference uses exact OCC booleans on STEP/IGES, and mesh booleans for STL/OBJ/GLB only when
  the meshes are watertight (others are reported as unchecked). Parts that only touch are not
  reported. Very large assemblies are limited to 3000 candidate pairs.
- IGES files that contain only surfaces have no volume; this is listed in the warnings.
