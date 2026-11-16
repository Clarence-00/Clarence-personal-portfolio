"""Headless rendering of the generated viewer with Playwright (Chromium + software WebGL).

Previews are screenshots of the real viewer, so they always match what you see in the HTML.

Setup (once):  pip install playwright  &&  python -m playwright install chromium
If you already have a Chromium/Chrome binary, point to it with --chromium or C2H_CHROMIUM.
"""
from __future__ import annotations

import base64
import os
from contextlib import contextmanager
from pathlib import Path

VIEWS = [  # (file suffix, camera view, explode 0..1)
    ("iso", "iso", 0.0),
    ("front", "front", 0.0),
    ("top", "top", 0.0),
    ("right", "right", 0.0),
    ("exploded_iso", "iso", 1.0),
]
# Software WebGL so rendering works the same headless, in CI and on machines without a GPU.
CHROME_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


class RenderError(Exception):
    pass


@contextmanager
def open_viewer(html_path, chromium=None, size=(1600, 1200), render_mode=True):
    """Yield (page, errors) for the viewer loaded and ready. errors collects console errors."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise RenderError("Playwright is not installed. Run:  pip install playwright  &&  "
                          "python -m playwright install chromium   (or use --no-previews)")
    chromium = chromium or os.environ.get("C2H_CHROMIUM")
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(executable_path=chromium or None, args=CHROME_ARGS)
        except Exception as exc:
            raise RenderError(f"Could not start Chromium ({str(exc).splitlines()[0]}). Run "
                              "`python -m playwright install chromium`, or pass --chromium /path/to/chrome.")
        try:
            page = browser.new_page(viewport={"width": size[0], "height": size[1]}, device_scale_factor=1)
            errors = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(f"page error: {e}"))
            url = Path(html_path).resolve().as_uri() + ("?render=1" if render_mode else "")
            page.goto(url)
            page.wait_for_function("() => window.c2h !== undefined", timeout=60000)
            page.evaluate("() => window.c2h.ready")
            yield page, errors
        finally:
            browser.close()


def render_previews(html_path, out_dir, chromium=None, size=(1600, 1200)):
    """Write preview_<view>.png files. Returns (list of paths, console errors)."""
    out_dir = Path(out_dir)
    files = []
    with open_viewer(html_path, chromium, size) as (page, errors):
        for suffix, view, explode in VIEWS:
            data_url = page.evaluate(
                "([view, ex]) => { c2h.resetJoints(); c2h.setExplode(ex); c2h.setView(view); return c2h.capture(); }",
                [view, explode])
            path = out_dir / f"preview_{suffix}.png"
            path.write_bytes(base64.b64decode(data_url.split(",", 1)[1]))
            files.append(path)
    return files, errors
