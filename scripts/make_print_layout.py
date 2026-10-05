"""Build a physically sized, tiled A3 PDF from the exact head texels."""

import argparse
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor, black
from reportlab.lib.utils import ImageReader
from reportlab.lib.pagesizes import A3
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
FACES = ("front", "right", "back", "left", "top", "bottom")
INK = HexColor("#202b33")
MUTED = HexColor("#56616a")


def label(c, x, y, text, size=11, bold=False):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x * mm, y * mm, text)


def face_pixels(c, image, x, y, size, start=0, end=None, wrap=25):
    """Draw crisp nearest-neighbour texels, clipped to a strip in mm."""
    end = size if end is None else end
    paper = Image.new("RGBA", image.size, "white")
    paper.alpha_composite(image)
    pixels = round(size * 4)
    border = round(wrap * 4)
    core = paper.convert("RGB").resize((pixels, pixels), Image.Resampling.NEAREST)
    artwork = Image.new("RGB", (pixels + 2 * border, pixels + 2 * border))
    artwork.paste(core, (border, border))
    for box, dest, dimensions in [
        ((0, 0, 1, pixels), (0, border), (border, pixels)),
        ((pixels-1, 0, pixels, pixels), (border+pixels, border), (border, pixels)),
        ((0, 0, pixels, 1), (border, 0), (pixels, border)),
        ((0, pixels-1, pixels, pixels), (border, border+pixels), (pixels, border)),
    ]:
        artwork.paste(core.crop(box).resize(dimensions, Image.Resampling.NEAREST), dest)
    for sx, dx in ((0, 0), (pixels-1, pixels+border)):
        for sy, dy in ((0, 0), (pixels-1, pixels+border)):
            artwork.paste(core.getpixel((sx, sy)), (dx, dy, dx+border, dy+border))
    c.saveState()
    clip = c.beginPath()
    total = size + 2 * wrap
    clip.rect(x * mm, y * mm, (end - start) * mm, total * mm)
    c.clipPath(clip, stroke=0)
    c.drawImage(ImageReader(artwork), (x - start - wrap) * mm, y * mm,
                width=total * mm, height=total * mm)
    c.restoreState()


def crop_marks(c, x, y, width, height):
    c.setStrokeColor(black)
    c.setLineWidth(0.4)
    for corner_x in (x, x + width):
        for corner_y in (y, y + height):
            dx = -1 if corner_x == x else 1
            dy = -1 if corner_y == y else 1
            c.line((corner_x + dx * 2) * mm, corner_y * mm,
                   (corner_x + dx * 7) * mm, corner_y * mm)
            c.line(corner_x * mm, (corner_y + dy * 2) * mm,
                   corner_x * mm, (corner_y + dy * 7) * mm)


def scale_bar(c, x, y):
    c.setStrokeColor(INK)
    c.setLineWidth(0.7)
    c.line(x * mm, y * mm, (x + 100) * mm, y * mm)
    for pos in (x, x + 100):
        c.line(pos * mm, (y - 2) * mm, pos * mm, (y + 2) * mm)
    label(c, x, y - 7, "This line must measure exactly 100 mm", 9)


def overlap_marks(c, x, y, width, height, overlap, part):
    """Bracket the shared band outside the artwork at both ends."""
    lo = x + width - overlap if part == "A" else x
    hi = lo + overlap
    c.setStrokeColor(INK)
    c.setLineWidth(0.7)
    bracket_y = y + height + 9
    c.line(lo * mm, bracket_y * mm, hi * mm, bracket_y * mm)
    for pos in (lo, hi):
        c.line(pos * mm, (bracket_y - 1) * mm, pos * mm, (bracket_y + 1) * mm)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(INK)
    text = f"{overlap:g} mm OVERLAP"
    if part == "A":
        c.drawRightString(hi * mm, (bracket_y + 4) * mm, text)
    else:
        c.drawString(lo * mm, (bracket_y + 4) * mm, text)
    # Short ticks project the inner overlap boundary past the top and bottom.
    inner = lo if part == "A" else hi
    c.setDash(1.5, 1.5)
    c.line(inner * mm, (y + height + 1) * mm, inner * mm, (bracket_y - 1) * mm)
    c.line(inner * mm, (y - 2) * mm, inner * mm, (y - 7) * mm)
    c.setDash()
    c.saveState()
    margin_x = x + width + 14 if part == "A" else x - 14
    c.translate(margin_x * mm, (y + height / 2) * mm)
    c.rotate(90)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(0, 0, "SHARED BAND: A goes on top" if part == "A"
                       else "SHARED BAND: B goes underneath A")
    c.restoreState()


def instructions(c, size, overlap, wrap):
    label(c, 20, 389, "WITHER SKELETON", 27, True)
    label(c, 20, 378, "Cardboard head / A3 printing and assembly", 13)
    label(c, 20, 360, f"Finished face: {size:g} x {size:g} mm   |   Join overlap: {overlap:g} mm", 12, True)
    label(c, 20, 351, f"Wrap tabs: {wrap:g} mm on all four edges (edge texture extended)", 11)
    sections = [
        (337, "1  CHECK THE BOX", [
            f"This file assumes each face measures {size:g} x {size:g} mm.",
            "Measure your box before printing the full set.",
        ]),
        (304, "2  PRINT AT ACTUAL SIZE", [
            "Use A3 paper (297 x 420 mm), portrait, single-sided.",
            "Choose Actual size / 100%. Turn off Fit, Shrink and borderless expansion.",
            "Print one panel first. Measure the 100 mm line before printing the rest.",
        ]),
        (263, "3  CHOOSE THE PAGES", [
            "Page 1 is this guide. Pages 2-11 cover front, right, back, left and top.",
            "Pages 12-13 are the optional bottom; skip them for an open-bottom head.",
        ]),
        (230, "4  TRIM AND JOIN EACH PAIR", [
            "Cut each printed rectangle using the corner marks; remove the white border.",
            f"Brackets mark the shared {overlap:g} mm: A's right edge and B's left edge.",
            "Lay B under A, align the shared bands, and keep the full printed rectangles.",
            f"Joined paper is {size+2*wrap:g} x {size+2*wrap:g} mm including tabs. Tape the reverse.",
        ]),
        (189, "5  TRIM TABS, FOLD AND ATTACH", [
            "Remove the four blank corner squares marked CUT. Keep the textured tabs.",
            f"Fold at the dashed margin ticks: the central face stays {size:g} x {size:g} mm.",
            "Keep UP on side panels; left/right refer to the wearer. Attach the front first.",
            "Wrap tabs onto neighbouring faces; bottom tabs can fold inside an open box.",
            "Cover tabs with adjacent panels. Add the top last, FRONT edge towards the face.",
            "Trim off any tab that would cover a face you have already finished.",
            "Place eye openings at your child's eye height; none are pre-cut in this file.",
        ]),
    ]
    for y, title, lines in sections:
        label(c, 20, y, title, 12, True)
        for index, line in enumerate(lines):
            label(c, 20, y - 9 - index * 6, line, 10)

    label(c, 20, 138, "HOW THE TWO STRIPS OVERLAP", 11, True)
    # An illustrative join diagram (not a scale template).
    c.setFillColor(HexColor("#dbe0e3"))
    c.rect(35 * mm, 102 * mm, 105 * mm, 22 * mm, stroke=0, fill=1)
    c.setFillColor(HexColor("#aebbc3"))
    c.rect(134 * mm, 102 * mm, 105 * mm, 22 * mm, stroke=0, fill=1)
    c.setFillColor(INK)
    c.rect(134 * mm, 102 * mm, 6 * mm, 22 * mm, stroke=0, fill=1)
    label(c, 44, 111, "A - left strip", 10, True)
    label(c, 166, 111, "B - right strip", 10, True)
    label(c, 35, 91, "The dark band shows the shared texture. A goes on top of B.", 10)
    label(c, 20, 74, "Source pixels are enlarged without smoothing to keep the block edges sharp.", 10)
    scale_bar(c, 20, 51)
    label(c, 20, 22, "Guide page / no cutting template on this page", 9)
    c.showPage()


def wrap_marks(c, x, y, width, size, wrap, part):
    total = size + 2 * wrap
    fold_x = x + wrap if part == "A" else x + width - wrap
    # Blank corner squares are waste, with solid cut edges.
    for corner_y in (y, y + total - wrap):
        corner_x = x if part == "A" else x + width - wrap
        c.setFillColorRGB(1, 1, 1)
        c.rect(corner_x*mm, corner_y*mm, wrap*mm, wrap*mm, stroke=0, fill=1)
        c.setStrokeColor(INK)
        c.setLineWidth(0.5)
        inner_y = corner_y + wrap if corner_y == y else corner_y
        c.line(fold_x*mm, corner_y*mm, fold_x*mm, (corner_y+wrap)*mm)
        c.line(corner_x*mm, inner_y*mm, (corner_x+wrap)*mm, inner_y*mm)
        label(c, corner_x + 7, corner_y + wrap/2 - 1, "CUT", 8, True)
    c.setStrokeColor(INK)
    c.setDash(2, 1)
    for edge_y, direction in ((y, -1), (y+total, 1)):
        c.line(fold_x*mm, (edge_y+direction*2)*mm,
               fold_x*mm, (edge_y+direction*7)*mm)
    for fold_y in (y + wrap, y + wrap + size):
        for edge, direction in ((x, -1), (x+width, 1)):
            c.line((edge+direction*2)*mm, fold_y*mm, (edge+direction*9)*mm, fold_y*mm)
    c.setDash()
    # Fold direction and tab depth are labelled in the outer side margin.
    c.saveState()
    margin_x = x - 17 if part == "A" else x + width + 17
    c.translate(margin_x*mm, (y+total/2)*mm)
    c.rotate(90)
    c.setFont("Helvetica", 10)
    c.drawCentredString(0, 0, f"{wrap:g} mm wrap tabs / dashed ticks = fold / solid corner lines = cut")
    c.restoreState()


def panel(c, face, image, part, size, overlap, wrap, page):
    total = size + 2 * wrap
    strip_width = (size + overlap) / 2 + wrap
    start = -wrap if part == "A" else (size - overlap) / 2
    end = start + strip_width
    x = (297 - strip_width) / 2
    y = 377 - total
    descriptor = "left strip" if part == "A" else "right strip"
    title = face.upper() + (" (OPTIONAL)" if face == "bottom" else "")
    label(c, 20, 405, f"{title} / {part} - {descriptor}", 17, True)
    label(c, 20, 397, f"{size:g} mm face + {wrap:g} mm wrap tabs | A3 portrait | Actual size / 100%", 10)
    face_pixels(c, image, x, y, size, start, end, wrap)
    crop_marks(c, x, y, strip_width, total)
    wrap_marks(c, x, y, strip_width, size, wrap, part)
    overlap_marks(c, x, y, strip_width, total, overlap, part)
    edge = "UP" if face not in ("top", "bottom") else "BACK EDGE" if face == "top" else "BOTTOM PANEL"
    label(c, x + strip_width / 2 - 10, y + total + 9, edge, 9, True)
    label(c, 20, 15, "FRONT edge at bottom" if face == "top" else f"Strip: {strip_width:g} x {total:g} mm", 9)
    scale_bar(c, 170, 16)
    label(c, 20, 8, f"Join with {overlap:g} mm overlap. A on top of B. Keep wrap tabs.", 8)
    label(c, 280, 8, f"{page}/13", 8)
    c.showPage()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size-mm", type=float, default=300)
    args = parser.parse_args()
    size = args.size_mm
    overlap = 40
    wrap = 25
    if not 200 <= size <= 300:
        parser.error("This A3 wrap-tab layout supports faces between 200 and 300 mm.")
    output = ROOT / "output/pdf" / f"wither-head-a3-{size:g}mm.pdf"
    output.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(output), pagesize=A3, pageCompression=1)
    c.setTitle(f"Wither Skeleton Head - {size:g} mm - A3 print panels")
    c.setAuthor("Wither Head costume project")
    instructions(c, size, overlap, wrap)
    page = 2
    for face in FACES:
        with Image.open(ROOT / f"assets/head/{face}-8px.png") as image:
            for part in ("A", "B"):
                panel(c, face, image.convert("RGBA"), part, size, overlap, wrap, page)
                page += 1
    c.save()
    print(output)


if __name__ == "__main__":
    main()
