"""Regenerate docs/icons/field-grid.png — the seamless football-field
background texture referenced by body{} in docs/styles.css.

A bold yard line across the tile's top edge (continuous when tiled
horizontally) plus a short, confined hash tick just beneath it (repeats
every tile-width horizontally). Transparent PNG so it composites over the
--field background-color token. Run: python tools/make-field-grid.py
"""
from PIL import Image, ImageDraw

TILE_W, TILE_H = 96, 384
LINE = (40, 68, 47)  # --field-press, from docs/styles.css :root

img = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Yard line and hash tick are drawn as ONE contiguous shape (same color/alpha,
# no seam between them) so they read as a connected mark, not two separate
# floating pieces -- the previous version used different alpha values for
# each rectangle, which (even though the pixels technically touched) looked
# disconnected at low opacity.
ALPHA = 115
d.rectangle([0, 0, TILE_W, 4], fill=LINE + (ALPHA,))               # yard line, full tile width
tick_x0, tick_x1 = TILE_W // 2 - 2, TILE_W // 2 + 2
d.rectangle([tick_x0, 0, tick_x1, 20], fill=LINE + (ALPHA,))        # hash tick, overlapping the yard line from y=0

OUT = r"C:\Users\brand\PROJECTS\AlienFacepalm\FOOTBALL\gejfa_rules\docs\icons\field-grid.png"
img.save(OUT, optimize=True)
print("wrote", OUT, img.size)
