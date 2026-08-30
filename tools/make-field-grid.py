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

d.rectangle([0, 0, TILE_W, 4], fill=LINE + (128,))              # yard line
tick_x0, tick_x1 = TILE_W // 2 - 1, TILE_W // 2 + 1
d.rectangle([tick_x0, 5, tick_x1, 17], fill=LINE + (102,))       # hash tick

OUT = r"C:\Users\brand\PROJECTS\AlienFacepalm\FOOTBALL\gejfa_rules\docs\icons\field-grid.png"
img.save(OUT, optimize=True)
print("wrote", OUT, img.size)
