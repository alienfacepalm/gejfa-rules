# GEJFA Rules — Sideline Lookup

Instant lookup for the **2025 GEJFA rulebook** (Greater Eastside Junior Football Association). Built for coaches on the sideline: type a situation, get the ruling in seconds — with the exact citation and official rule text one tap away.

**Live app:** https://alienfacepalm.github.io/gejfa-rules/

## Use it on your phone

Open the link above, then:
- **Android (Chrome/Edge):** menu → **Install app** (or "Add to Home screen")
- **iPhone (Safari):** Share → **Add to Home Screen**

After the first load it works fully **offline** — no signal needed at the field.

## What's inside

- `docs/` — the app (static PWA, no build step, no backend)
  - `data/rules.js` — the 2025 rulebook structured into ~80 entries (plain-English answer + citation + verbatim rule text)
  - `data/situations.js` — 45 common sideline scenarios
  - `data/synonyms.js` — coach-speak → rulebook-term search expansion
  - `data/diagrams.js` — chalk-style SVG diagrams (possession spots, 8-player formation, OT formats, brackets…)
  - `search.js` — pure search/ranking logic (portable to a native port)
- `2025 GEJFA Rules Final.pdf` — the source rulebook
- `DESIGN.md` — art direction source of truth (collegiate athletic apparel spec)

## Updating for a new season

1. Re-curate `docs/data/rules.js` / `situations.js` from the new rulebook
2. Bump `CACHE_VERSION` in `docs/sw.js`
3. Push — installed apps pick up the new rules on next launch with connectivity

Quick-reference only — the official GEJFA rulebook and NFHS rules govern.
