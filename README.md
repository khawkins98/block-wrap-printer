# Wither Skeleton Halloween Head

Printable paper panels for a child's Minecraft Wither Skeleton Halloween costume.

## Project brief

- An approximately 30 cm cube cardboard box has already been made for the head.
- Create Minecraft-style Wither Skeleton textures to cover the box.
- Prepare printable A3 sheets that can be cut out and attached to the cardboard.

## Print constraints

A3 paper measures 297 × 420 mm. A 300 × 300 mm face is slightly wider than
the short side of an A3 sheet, even before allowing for printer margins.
Plan to tile each face across sheets with overlap for assembly, unless the
measured box dimensions permit another layout.

Before producing final print files, measure the box's actual face dimensions
and decide where the eye openings should go. Print final panels at 100%
scale rather than using “fit to page.”

## Outputs

- Editable source artwork.
- A3 print-ready PDF panels: `output/pdf/wither-head-a3-300mm.pdf`.
- Cutting, alignment, and assembly instructions on the PDF's first page.

## Printing the 30 cm head

The PDF assumes an exactly **300 × 300 mm** face. Measure the cardboard box
before printing the full set.

- Use A3 portrait, single-sided, at **Actual size / 100%**. Disable Fit or Shrink.
- Page 1 is the assembly guide.
- Print pages **2–11** for the front, right, back, left, and top (10 sheets).
- Pages **12–13** add an optional bottom. Its transparent source area prints white.
- Each face uses two **195 × 350 mm** strips with a **40 mm overlap**.
- **25 mm wrap tabs** extend all four edges. Texture extends from the edge pixels;
  the central face remains 300 × 300 mm. Joined paper spans 350 × 350 mm.
- Brackets and boundary ticks outside the artwork mark the shared band:
  the rightmost 40 mm of A and the leftmost 40 mm of B. Keep both bands.
- Trim at the corner marks and put strip A on top of B, aligning the shared texture.
- Remove the four blank corner squares marked CUT. Fold at the dashed margin
  ticks and glue the textured tabs around the box edges. Bottom tabs can fold
  inside an open box. Cover tabs with adjacent panels; trim tabs that would cover
  an already finished face.
- Verify the printed calibration line measures **100 mm**, and each assembled
  central face between fold positions measures **300 × 300 mm**.
- Position any eye openings to suit the wearer; the PDF does not pre-cut them.

To regenerate the PDF, or adapt it to a measured square face (200–300 mm):

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/make_print_layout.py --size-mm 300
```

## Head texture assets

The supplied 64 × 32 skeleton texture is preserved in
`assets/source/wither-skeleton.png`. Only its six head faces are extracted
into `assets/head/`: front, back, left, right, top, and bottom.
Left and right refer to the character's own sides.

Each face has an original 8 × 8 PNG and an 800 × 800 PNG enlarged using
nearest-neighbour scaling to preserve the square pixels. These PNGs are
artwork assets; they do not yet set a physical print size.
`head-atlas-preview.png` shows the head portion in the original texture layout,
not a folding template.

The extraction coordinates follow the
[Minotar skin specification](https://github.com/minotar/skin-spec#components).
To reproduce the assets with Python and Pillow installed:

```sh
python3 scripts/extract_head.py
```
