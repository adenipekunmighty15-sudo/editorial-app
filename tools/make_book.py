"""Generate an interactive 3D hardcover notebook and export it as GLB.

Run headless:
    blender --background --python tools/make_book.py -- <output.glb>

Coordinate convention (chosen so the exported glTF faces the camera):
    Blender X = page width  (spine at x=0, pages extend to +x)
    Blender Z = page height (centred on 0)
    Blender Y = thickness   (front cover at -Y, back cover at +Y)

Blender's glTF Y-up conversion maps this to gltf X = width, Y = height,
Z = toward the camera. Every object's ORIGIN is placed on its hinge (x=0 for
pages/covers) so a single rotation.y animates an open, page-turn, or flip.
"""

import sys
import os

import bpy
import bmesh

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = ARGS[0] if ARGS else "book.glb"

PAGE_W = 1.35
PAGE_H = 2.00
SHEET_T = 0.014
SHEETS = 12
COVER_T = 0.055
COVER_W = PAGE_W + 0.07
COVER_H = PAGE_H + 0.14

STACK_T = SHEETS * SHEET_T
FRONT_Y = -STACK_T / 2 - COVER_T / 2
BACK_Y = STACK_T / 2 + COVER_T / 2


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for item in list(block):
            block.remove(item)


def make_material(name, color, roughness=0.7, metallic=0.0, sheen=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r, g, b = color
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for key in ("Sheen Weight", "Sheen"):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = sheen
            break
    return mat


def make_box(name, origin, bounds, material, bevel=0.0, segments=3):
    """bounds = (x0, x1, y0, y1, z0, z1) in world space; mesh stored relative to origin."""
    ox, oy, oz = origin
    x0, x1, y0, y1, z0, z1 = bounds

    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = (x0 if v.co.x < 0 else x1) - ox
        v.co.y = (y0 if v.co.y < 0 else y1) - oy
        v.co.z = (z0 if v.co.z < 0 else z1) - oz
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.location = (ox, oy, oz)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(material)

    if bevel > 0:
        mod = obj.modifiers.new("Bevel", type="BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def main():
    reset_scene()

    leather = make_material("Leather", (0.28, 0.10, 0.06), roughness=0.58, sheen=0.3)
    leather_in = make_material("LeatherInner", (0.20, 0.07, 0.045), roughness=0.7)
    paper = make_material("Paper", (0.93, 0.87, 0.72), roughness=0.95)
    ribbon_mat = make_material("Ribbon", (0.60, 0.10, 0.09), roughness=0.75)
    metal = make_material("Metal", (0.62, 0.48, 0.20), roughness=0.32, metallic=0.85)

    # Back cover — origin on the spine hinge so it shares the book's centre line
    make_box(
        "Cover_Back", (0.0, BACK_Y, 0.0),
        (-0.01, COVER_W, BACK_Y - COVER_T / 2, BACK_Y + COVER_T / 2, -COVER_H / 2, COVER_H / 2),
        leather, bevel=0.02,
    )

    # Front cover — hinged at the spine (x=0), opens to the left
    make_box(
        "Cover_Front", (0.0, FRONT_Y, 0.0),
        (-0.01, COVER_W, FRONT_Y - COVER_T / 2, FRONT_Y + COVER_T / 2, -COVER_H / 2, COVER_H / 2),
        leather, bevel=0.02,
    )

    # Spine wrap
    make_box(
        "Spine", (-(COVER_T + 0.005) / 2, 0.0, 0.0),
        (-COVER_T - 0.005, 0.0, FRONT_Y, BACK_Y, -COVER_H / 2, COVER_H / 2),
        leather_in, bevel=0.015,
    )

    # Individual page sheets — each hinged on the spine at x=0, centred on z=0
    for i in range(SHEETS):
        y_center = STACK_T / 2 - SHEET_T / 2 - i * SHEET_T
        make_box(
            f"Page_{i + 1:03d}", (0.0, y_center, 0.0),
            (0.0, PAGE_W, y_center - SHEET_T / 2, y_center + SHEET_T / 2, -PAGE_H / 2, PAGE_H / 2),
            paper,
        )

    # Ribbon bookmark resting on the front of the stack, hanging past the foot
    make_box(
        "Ribbon", (0.09, 0.0, 0.0),
        (0.02, 0.16, -STACK_T / 2 - 0.006, -STACK_T / 2 - 0.001, -PAGE_H / 2 - 0.55, -PAGE_H / 2 + 0.45),
        ribbon_mat,
    )

    # Elastic closure strap across the front cover near the fore-edge
    strap_y = FRONT_Y - COVER_T / 2 - 0.006
    make_box(
        "Clasp", (COVER_W - 0.22, strap_y, 0.0),
        (COVER_W - 0.30, COVER_W - 0.14, strap_y - 0.005, strap_y + 0.005, -COVER_H / 2, COVER_H / 2),
        metal, bevel=0.006,
    )
    make_box(
        "Clasp_Loop", (COVER_W - 0.125, FRONT_Y - COVER_T / 2 - 0.012, 0.0),
        (COVER_W - 0.16, COVER_W - 0.09, FRONT_Y - COVER_T / 2 - 0.02, FRONT_Y - COVER_T / 2 - 0.004, -0.09, 0.09),
        metal, bevel=0.01,
    )

    for obj in bpy.data.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["Cover_Front"]

    bpy.ops.export_scene.gltf(
        filepath=os.path.abspath(OUT),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
    )
    print(f"Exported {OUT}")


main()
