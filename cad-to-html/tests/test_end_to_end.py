"""End-to-end test: sample assembly -> full pipeline -> viewer checked in headless Chromium.

Run from anywhere:
    python cad-to-html/tests/test_end_to_end.py            # plain script, prints PASS/FAIL
    python -m pytest cad-to-html/tests -q                  # or with pytest

Set C2H_CHROMIUM=/path/to/chrome if Playwright's own Chromium is not installed.
Outputs go to out/_test/ (relative to the current directory).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
TOOL = HERE.parent
sys.path.insert(0, str(TOOL))
sys.path.insert(0, str(TOOL / "samples"))

import build            # noqa: E402
import convert          # noqa: E402
import inspect_model    # noqa: E402
import make_sample      # noqa: E402
import render           # noqa: E402

OUT = Path("out/_test")
STEP = OUT / "hinged_box.step"
BUILD = OUT / "hinged_box"
OUT.mkdir(parents=True, exist_ok=True)
_built = False


def build_sample():
    global _built
    if not _built:
        make_sample.main(STEP)
        assert build.main([str(STEP), "--manifest", str(TOOL / "samples/hinged_box.manifest.json"),
                           "--out", str(BUILD)]) == 0
        _built = True


def test_outputs_exist():
    build_sample()
    for name in ["hinged_box.html", "model.glb", "tree.json", "bom.csv", "bom.xlsx", "report.md",
                 "manifest.json", "preview_iso.png", "preview_front.png", "preview_top.png",
                 "preview_right.png", "preview_exploded_iso.png"]:
        assert (BUILD / name).stat().st_size > 0, name


def test_bom_dedupes_identical_pins():
    build_sample()
    rows = list(csv.DictReader(open(BUILD / "bom.csv", encoding="utf-8")))
    by_name = {r["name"]: r for r in rows}
    assert len(rows) == 4, rows
    assert by_name["hinge_pin"]["quantity"] == "2"
    assert by_name["hinge_pin"]["material"] == "steel"
    assert abs(float(by_name["latch"]["volume_mm3"]) - 420.0) < 0.01       # 14 x 10 x 3
    assert by_name["base"]["bbox_x_mm"] == "80.0"
    assert float(by_name["hinge_pin"]["unit_mass_g"]) > 1.0


def test_tree_and_report():
    build_sample()
    tree = json.loads((BUILD / "tree.json").read_text())
    ids = {n["id"] for n in tree["nodes"]}
    assert "hinged_box/lid_assembly/latch" in ids
    assert tree["summary"]["bbox"]["size"] == [80.0, 68.0, 47.0]
    report = (BUILD / "report.md").read_text(encoding="utf-8")
    assert "Interference / overlap\n\nNone found" in report
    assert "`lid_hinge`" in report and "`latch_slide`" in report


def test_auto_guess_finds_lid_hinge():
    build_sample()
    out = OUT / "inspect"
    assert inspect_model.main([str(STEP), "--out", str(out)]) == 0
    guess = json.loads((out / "manifest.guess.json").read_text())
    hinge = next(j for j in guess["joints"] if j["type"] == "hinge")
    assert hinge["part_ids"] == ["hinged_box/lid_assembly"]
    assert hinge["axis"] == [-1.0, 0.0, 0.0]          # opens upward
    assert np.allclose(hinge["pivot"][1:], [34, 40])
    assert all(j["confidence"] == "low" for j in guess["joints"])
    assert not any("pin" in j["id"] for j in guess["joints"])  # fixed hardware is never guessed


def test_viewer_loads_and_joints_work():
    build_sample()
    with render.open_viewer(BUILD / "hinged_box.html", render_mode=False, size=(1280, 800)) as (page, errors):
        assert page.evaluate("c2h.partCount()") == 5
        # limits are enforced
        assert page.evaluate("c2h.setJoint('lid_hinge', 500)") == 110
        assert page.evaluate("c2h.setJoint('latch_slide', -5)") == 0
        # the latch rides along with the opened lid (child joint inside parent joint)
        z_closed = page.evaluate("c2h.setJoint('lid_hinge', 0), c2h.partWorldBox('hinged_box/lid_assembly/latch')[1][2]")
        z_open = page.evaluate("c2h.setJoint('lid_hinge', 90), c2h.partWorldBox('hinged_box/lid_assembly/latch')[1][2]")
        assert z_open > z_closed + 20, (z_closed, z_open)
        # slider moves the latch along -Y by the requested amount
        y0 = page.evaluate("c2h.resetJoints(), c2h.partWorldBox('hinged_box/lid_assembly/latch')[0][1]")
        y1 = page.evaluate("c2h.setJoint('latch_slide', 6), c2h.partWorldBox('hinged_box/lid_assembly/latch')[0][1]")
        assert abs((y0 - y1) - 6) < 1e-6
        # measure, pick, section, explode, and every toolbar button
        assert abs(page.evaluate("c2h.measure([0,0,0],[3,4,0])") - 5) < 1e-9
        page.evaluate("c2h.resetJoints(); c2h.setView('iso')")
        assert page.evaluate("c2h.pickAt(640, 400)") is not None
        page.evaluate("c2h.setSection(true, 'X', 0.5); c2h.setExplode(0.7); c2h.select('hinged_box/lid_assembly')")
        page.evaluate("c2h.setOpacity('hinged_box/base', 0.3)")
        for action in ["edges", "wireframe", "axes", "theme", "fit", "reset-view", "show-all", "measure"]:
            page.click(f"[data-action='{action}']")
        for view in ["front", "top", "right", "iso"]:
            page.click(f"[data-view='{view}']")
        page.locator(".node .name", has_text="latch").click()
        assert "latch" in page.inner_text("#info")
        assert errors == [], errors


def test_interference_is_detected():
    """Two overlapping boxes: once via STEP (OCC boolean) and once via GLB (mesh boolean)."""
    import cadquery as cq
    import trimesh
    assy = cq.Assembly(name="overlap")
    assy.add(cq.Workplane().box(10, 10, 10), name="a")
    assy.add(cq.Workplane().box(10, 10, 10), name="b", loc=cq.Location(cq.Vector(8, 0, 0)))
    step = OUT / "overlap.step"
    assy.export(str(step))
    scene = trimesh.Scene()
    scene.add_geometry(trimesh.creation.box((10, 10, 10)), node_name="a", geom_name="box")
    scene.add_geometry(trimesh.creation.box((10, 10, 10)), node_name="b", geom_name="box",
                       transform=trimesh.transformations.translation_matrix((8, 0, 0)))
    glb = OUT / "overlap_mesh.glb"
    scene.export(str(glb))
    for src in (step, glb):
        out = OUT / src.stem
        assert build.main([str(src), "--out", str(out), "--no-previews"]) == 0
        report = (out / "report.md").read_text(encoding="utf-8")
        assert "| Overlap volume (mm³) |" in report, report
        assert "200.000" in report, report   # 2 x 10 x 10 mm overlap


def test_native_cad_is_rejected_with_advice():
    bad = OUT / "part.SLDPRT"
    bad.write_bytes(b"not really")
    try:
        convert.load_model(bad)
    except convert.ConversionError as exc:
        assert "STEP" in str(exc)
    else:
        raise AssertionError("expected ConversionError")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    failed = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS  {name}")
            except Exception as exc:  # report and keep going
                failed += 1
                print(f"FAIL  {name}: {type(exc).__name__}: {exc}")
    print("\nall tests passed" if not failed else f"\n{failed} test(s) failed")
    sys.exit(1 if failed else 0)
