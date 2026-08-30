# Apparel Design Specifications: Skyline Spartans

## Overview
This document outlines the apparel design specifications based on the provided visual mockups for Skyline high school / community team sports (Spartans, Sammamish, Washington, established/year 2026).

---

## Design 1: Classic Spartan Helmet T-Shirt (Left)

* **Garment Type:** Crewneck Short-Sleeve T-Shirt
* **Garment Color:** Forest Green
* **Graphic Elements:**
  * **Center Chest:** Large stylized white Spartan helmet logo facing right, featuring classic Corinthian crest details, feather plume cutouts, and eye slit.
* **Color Palette:**
  * Forest Green (Apparel base)
  * Crisp White (Print graphic)

---

## Design 2: Collegiate Arc Sweatshirt (Right)

* **Garment Type:** Crewneck Long-Sleeve Sweatshirt / Pullover
* **Garment Color:** Dark Forest Green
* **Graphic Elements:**
  * **Top Arc Text:** "SKYLINE" rendered in a bold, collegiate block athletic serif font, curved in an arch.
  * **Middle Sub-banner / Year:** 
    * Left/Right smaller text: "SAMMAMISH" (left) and "WASHINGTON" (right) flanking the center year.
    * Center year: "**2026**" displayed in a clean athletic bold typeface inside a horizontal bar / banner element.
    * A solid horizontal accent stripe runs below the year/location line.
  * **Bottom Text:** "SPARTANS" rendered in a matching bold, collegiate block athletic serif font below the banner.
* **Color Palette:**
  * Dark Forest Green (Apparel base)
  * White / Light Grey (Print graphics and text)

---

## Palette (hex reference)

No hex values were specified in the original mockups — this section formalizes the "Forest Green / Crisp White / Light Grey" description into the exact values implemented across the app (`docs/styles.css` custom properties), so future work has one canonical source instead of re-deriving colors by eye.

| Swatch | Token | Hex | Role |
|---|---|---|---|
| 🟩 | `--field` | `#16281c` | Garment base — page/header background |
| 🟩 | `--field-deep` | `#101f15` | Shadowed seam — recessed surfaces, deepest layer |
| 🟩 | `--field-raised` | `#1f3627` | Tee green — card and control surfaces |
| 🟩 | `--field-press` | `#28442f` | Pressed/active surface, dividers |
| ⬜ | `--chalk` | `#f5f3ec` | Opaque white plastisol ink — primary text, print graphics |
| ⬜ | `--chalk-dim` | `#b7c2b6` | Light grey print — secondary text |
| ⬜ | `--chalk-faint` | `#7e8f80` | Worn print — meta/caption text |

Rule: **two color families only** (forest green + chalk white/grey) — hierarchy comes from value steps within each family, plus type and the accent stripe, never a third hue. Any background texture or gradient must be built from these same tokens (see "Non-solid background" below), not new colors.

### Non-solid background
The page background is `--field` with a faint diagonal 1px pinstripe in `--field-press` repeating every 26px — reads as brushed athletic fabric rather than a flat fill. Deliberately a uniform repeating pattern (not a viewport-anchored gradient/vignette): it tiles correctly on long scrollable pages and avoids `background-attachment: fixed`, which has known rendering conflicts with `position: sticky` in Safari. Static, no animation, stays within the two-color palette above. Elements with their own solid surface (`.hero`, `.searchwrap`, `.card`, etc.) paint over it; it shows through in the margins and gaps between them.

---

## Production Notes & Specifications
* **Printing Technique:** Screen print or high-durability heat transfer vinyl (HTV).
* **Placement:** Centered chest placement for both styles.
* **Recommended Inks:** Opaque white plastisol ink for dark green fabric to ensure high contrast and vibrancy.
