r"""Generate the sample assembly used by the end-to-end test.

A hinged box (Z-up, millimetres):

    hinged_box
    ├── base            open box with two hinge knuckles on the back edge
    ├── hinge_pin       \  two instances of the SAME pin geometry
    ├── hinge_pin       /  (tests BOM de-duplication -> qty 2)
    └── lid_assembly
        ├── lid         plate with a centre knuckle, rotates about the pin axis
        └── latch       small block on the lid that slides forward (-Y)

The hinge axis runs along X at (y=34, z=40).

Usage:
    python samples/make_sample.py [output.step]
"""
import sys
from pathlib import Path

import cadquery as cq

# --- key dimensions (mm) ---------------------------------------------------
W, D, H = 80.0, 60.0, 40.0   # base outer width (X), depth (Y), height (Z)
WALL = 3.0
LID_T = 4.0
HINGE_Y, HINGE_Z = 34.0, 40.0  # hinge axis location
KNUCKLE_R = 4.0
HOLE_R = 1.6
PIN_R = 1.5
PIN_LEN = 20.0


def x_cylinder(radius, x0, x1):
    """Solid cylinder along X from x0 to x1, centred on the hinge axis."""
    return (cq.Workplane("YZ", origin=(x0, 0, 0))
            .center(HINGE_Y, HINGE_Z).circle(radius).extrude(x1 - x0))


def make_base():
    body = cq.Workplane("XY").box(W, D, H, centered=(True, True, False))
    body = body.faces(">Z").shell(-WALL)                     # open-top box
    for x0, x1 in [(-36, -22), (22, 36)]:                    # two outer knuckles
        tab = cq.Workplane("XY").box(x1 - x0, 5, 8, centered=False).translate((x0, 29, 32))
        body = body.union(tab).union(x_cylinder(KNUCKLE_R, x0, x1))
    return body.cut(x_cylinder(HOLE_R, -40, 40))             # pin hole


def make_lid():
    plate = cq.Workplane("XY").box(W, D, LID_T, centered=(True, True, False)).translate((0, 0, H))
    tab = cq.Workplane("XY").box(42, 5, LID_T, centered=False).translate((-21, 29, H))
    lid = plate.union(tab).union(x_cylinder(KNUCKLE_R, -21, 21))  # centre knuckle
    return lid.cut(x_cylinder(HOLE_R, -40, 40))


def make_pin():
    # Modelled at the origin along X; placed by the assembly (instancing).
    return cq.Workplane("YZ").circle(PIN_R).extrude(PIN_LEN).translate((-PIN_LEN / 2, 0, 0))


def make_latch():
    return cq.Workplane("XY").box(14, 10, 3, centered=(True, False, False)).translate((0, -28, H + LID_T))


def build_assembly():
    pin = make_pin()
    lid_assy = cq.Assembly(name="lid_assembly")
    lid_assy.add(make_lid(), name="lid", color=cq.Color(0.88, 0.63, 0.19))
    lid_assy.add(make_latch(), name="latch", color=cq.Color(0.75, 0.22, 0.17))

    assy = cq.Assembly(name="hinged_box")
    assy.add(make_base(), name="base", color=cq.Color(0.29, 0.44, 0.65))
    for i, x in enumerate([-26.0, 26.0], start=1):
        assy.add(pin, name=f"hinge_pin_{i}", color=cq.Color(0.7, 0.7, 0.72),
                 loc=cq.Location(cq.Vector(x, HINGE_Y, HINGE_Z)))
    assy.add(lid_assy)
    return assy


def main(out_path):
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    build_assembly().export(str(out_path))
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/samples/hinged_box.step")
