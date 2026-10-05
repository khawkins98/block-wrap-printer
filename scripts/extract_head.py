"""Extract the six head faces from the supplied legacy Minecraft texture.

Requires Pillow. Run from any directory: python3 scripts/extract_head.py
"""

from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source/wither-skeleton.png"
OUTPUT = ROOT / "assets/head"

# Minecraft's base head UVs; side names refer to the character's own sides.
FACES = {
    "top": (8, 0, 16, 8),
    "bottom": (16, 0, 24, 8),
    "right": (0, 8, 8, 16),
    "front": (8, 8, 16, 16),
    "left": (16, 8, 24, 16),
    "back": (24, 8, 32, 16),
}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        if source.size != (64, 32):
            raise ValueError(f"Expected a 64 × 32 texture; got {source.size}")
        texture = source.convert("RGBA")

    # Export original texels and enlarged copies with crisp square pixels.
    atlas = texture.crop((0, 0, 32, 16))
    atlas.save(OUTPUT / "head-atlas.png")
    atlas.resize((1600, 800), Image.Resampling.NEAREST).save(
        OUTPUT / "head-atlas-preview.png"
    )
    for name, bounds in FACES.items():
        face = texture.crop(bounds)
        face.save(OUTPUT / f"{name}-8px.png")
        face.resize((800, 800), Image.Resampling.NEAREST).save(
            OUTPUT / f"{name}.png"
        )


if __name__ == "__main__":
    main()
