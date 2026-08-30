# SPEC — Skyline Spartans · GEJFA Rules 2025

Product and technical specification for the sideline rules-lookup PWA.

**THIS DOCUMENT IS THE PROJECT'S SOURCE OF TRUTH.** It was derived from — and its rule-content baseline fully audited 1:1 against — the official *2025 GEJFA Rules Final* PDF. As of that audit, authority transitions to this spec: project decisions, content standards, and verification procedures are governed here. The PDF remains the original source artifact (kept in the repo and linked in the app); when a new season's PDF is issued, it becomes the input for the next revision of this spec (see §10).

- **Live app:** https://alienfacepalm.github.io/gejfa-rules/
- **Repo:** https://github.com/alienfacepalm/gejfa-rules (Pages serves `main` → `/docs`)
- **Art direction:** `DESIGN.md` (collegiate athletic apparel spec; governs all styling)
- **Rule-content lineage:** `2025 GEJFA Rules Final.pdf` (adopted Aug 1, 2025) → `rules_extracted.txt` (verbatim dual-extractor-validated text) → `docs/data/*.js` (curated, audited 1:1, governed by this spec)

## 1. Purpose

A coach on the sideline must find out whether a rule covers a situation **within seconds**, mid-game, often with poor or no connectivity. The app answers a typed (or spoken) situation with a plain-English ruling, the exact rulebook citation, and the official rule text — fully offline after first load.

## 2. Non-negotiable constraints

1. **Accuracy (standing mandate):** every rule shown must be 1:1 accurate to the rule-content baseline established by this spec (audited against the 2025 rulebook PDF). Nothing may be invented, embellished, or altered in meaning. Plain-English answers may simplify wording but never substance. Situations not covered by the GEJFA book defer explicitly to NFHS rules (Part II §1). Every content change requires re-verification against `rules_extracted.txt` (the validated baseline text) before deploy; a new season's PDF supersedes the baseline only through the §10 revision procedure.
2. **Offline-first:** all data, search, fonts, icons, and the source PDF are precached by the service worker. No backend, no network dependency at the field.
3. **Simplicity:** static files, no build step, no framework, no accounts, no analytics. Deploy = `git push`.
4. **Portability (escape hatches):** the data modules and search engine are pure JavaScript with zero DOM/browser APIs, reusable unchanged in a future Capacitor or React Native port. Only `app.js` touches the DOM.
5. **Markdown convention:** all `.md` file names are ALL CAPS.

## 3. Architecture

```
docs/                          ← deployed root (GitHub Pages, main:/docs)
  index.html                   single page; hero, search row, sheets, results
  styles.css                   all styling; tokens per DESIGN.md
  app.js                       DOM glue ONLY (rendering, events, PWA wiring)
  search.js                    pure search engine factory (portable)
  data/rules.js                81 rule entries (portable, pure data)
  data/situations.js           45 situation cards + GEJFA_QUICK (8) (portable)
  data/synonyms.js             coach-speak → rulebook-term expansion (portable)
  data/diagrams.js             31 chalk-style SVG builders keyed by rule id (portable)
  vendor/minisearch.min.js     MiniSearch v7 UMD (only dependency, vendored)
  fonts/*.woff2                Graduate 400; Barlow 400/600/700 (self-hosted)
  icons/*.png                  192 / 512 / 512-maskable (Spartans lockup)
  manifest.webmanifest         "Skyline Spartans — GEJFA Rules 2025" / "Spartans Rules"
  sw.js                        cache-first service worker; version-stamped cache
  2025-gejfa-rules.pdf         official rulebook (linked upper-right, precached)
tests/
  verify-rules.js              pre-deploy gate: structural + source-fidelity + anchor + search tests (§9); NOT deployed (outside docs/)
```

## 4. Data model

`rules.js` — every substantive rule of the 2025 book (Parts I & II, Appendices A–C):

```js
{ id: "II-2-i", cite: "Part II §2.i", category: "weigh-in",
  title: "...", levels: ["all"] | ["rookie", ...],
  answer: "plain-English ruling (no substance changes)",
  text: "near-verbatim rule language (meaning-identical condensation only)",
  keywords: ["coach-speak", ...] }
```

`situations.js` — cards phrased the way a coach thinks (`question`, `answer`, `ruleId` link, `keywords`), ranked above raw rules. `GEJFA_QUICK` lists the 8 one-tap Game Time cards.
`synonyms.js` — single-token map (e.g. `mercy → 32 point rule`).
`diagrams.js` — SVG string builders per rule id; every label/number sourced from the book.
Categories (12) and levels (5: Rookie/Cub/Sophomore/JV/Varsity) are defined in `rules.js`.

## 5. Search behavior (`search.js`)

Ranking pipeline, in order:
1. **Intent patterns** — situational phrasings ("up 30", "down by 26", "4th and 10", "12 plays") expand the query toward the governing rule.
2. **Synonym expansion** — coach-speak tokens append rulebook terms.
3. **Number stripping** — standalone numeric tokens are removed from the indexed query (they are situational, and collide with numeric specs like ball sizes); intents carry their meaning.
4. **Precision pass** — multi-term queries run `combineWith: AND` first (×10 score boost).
5. **Recall pass** — expanded `OR` query fills in behind.

MiniSearch config: prefix + fuzzy(0.2); field boosts question 5 / title 4 / keywords 3.5 / answer 2 / text 0.6; situation docs ×1.4. The engine supports filtering by level (`all` or match) and category, but the UI only exposes the category filter — see §6 for why the level filter was removed. Empty query = browse (situations, then rules).

## 6. UX

- **Hero** (scrolls away): DESIGN.md "Design 2" lockup — arched SKYLINE (Graduate), `SAMMAMISH [2025] WASHINGTON` banner, accent stripe, SPARTANS. **PDF** button upper-right opens the official rulebook in a new tab.
- **Sticky search row**: autofocus-free large input, clear ×, mic (Web Speech API where supported), ☰ category filter button, and an always-visible **reset-to-home** button (`#resetHomeBtn`, calls `resetAll()`). Tapping the header logo does the same thing, but that gesture alone isn't discoverable — a user reported clicking it by accident without realizing it was clickable — so a real, always-visible button is the primary affordance and the logo tap is a bonus.
- **Category filter**: the only filter (a level filter — Rookie/Cub/Sophomore/JV/Varsity — was removed; see below). `#browseBtn` (class `.level-btn`, a historical name — see docs/styles.css) shows the active category's name on the button itself (default "Topic"), opening a bottom sheet (2-column grid of 12 categories + "All topics"); Escape/overlay close; focus returned. Deliberately not framed as a "browse" menu: it only ever allows one selection, so it is a filter, styled and worded like one (no separate pill, no hamburger icon).
- **Why there's no level filter**: measured directly — for 11 of 12 categories, every level (All/Rookie/Cub/Sophomore/JV/Varsity) returned an identical result count, because almost all GEJFA rules apply to every level and multi-level facts (e.g. quarter lengths) are stored as one `levels: ["all"]` entry rather than split per level. Only the 8-Player category actually varied. A control that changes the result for one category out of twelve isn't worth the UI space, so it was removed rather than kept as a rarely-useful filter.
- **Results**: banner-bar count divider. Cards show **title + 2-line clamped answer at a glance**; tapping opens the topic in focus mode (accordion — one open, auto-scrolled under the search bar) revealing the full answer, the section diagram (when one exists), the citation badge, level tags, and the official rule text. Query terms are highlighted.
- **Best match**: with a non-empty query the top hit renders pre-opened with a "Best match" tag.
- **Zero-typing paths**: Game Time grid (8 one-tap cards) and Recents (last 6 topics, localStorage) on the home state.
- **Empty state**: suggests re-phrasing, drawer browse, and states the NFHS fallback.
- Quality floor: 40px+ touch targets, `:focus-visible`, `prefers-reduced-motion`, safe-area insets, `aria-expanded`/dialog semantics.

## 7. Visual system (per DESIGN.md)

Black chrome, green field, chalk print: the hero and sticky search bar are solid black (`--ink` #050705) — team chrome, distinct from the playing surface below; everything from the results area down sits on dark forest green (`--field` #16281c, raised #1f3627, pressed #28442f) with chalk white (#f5f3ec) and light-grey secondary (#b7c2b6) type. The green content area's background is a faint gridiron grid (yard-line/hash rules in `--field-press`, 48px spacing), not a flat fill. Display type Graduate (collegiate block serif); body Barlow. Banner bars and the horizontal stripe are the structural motifs. Diagrams are chalk-on-green (X's-and-O's vernacular). See DESIGN.md's Palette section for the full token table.

## 8. PWA behavior

- **Sync/offline model — deliberately cache-first, not network-first.** `sw.js` always answers from cache instantly, refreshing that cache from the network in the background on every request when online. A network-first strategy was considered and rejected: on the poor sideline connectivity this app is built for, network-first would make every lookup wait on a slow/failing request before falling back to a perfectly good local copy — exactly the failure mode the app exists to avoid. "Full sync when online, offline works with the latest cached version" is delivered instead through the service-worker *version* lifecycle (below), which the coach can see and act on explicitly, rather than by racing the network on every tap.
- `CACHE_VERSION` (`gejfa-rules-vN`) in `sw.js` must be bumped on every content/app change. The update lifecycle is fully visible to the coach:
  1. **First-ever visit**: once everything is actually cached (`serviceWorker.ready`), a status message confirms *"Rulebook saved for offline use ✓."*
  2. **While online and a new version is found**: a *"Downloading rulebook update…"* status message shows for the duration of the fetch (relevant on slow field connections; the PDF alone is ~480 KB).
  3. **Once the new version is ready** (`controllerchange`, i.e. an update — not the first install): an actionable `.toast` reads *"Rulebook updated — tap to reload."* (A fuller "What's new" changelog sheet was tried and removed at the user's request — kept simple.)
  4. Status messages (`.toast-info`) are non-interactive and auto-dismiss; the update toast (`.toast`) stays until tapped, since reloading is the coach's call to make on their own time.
- `navigator.storage.persist()` requested so the offline cache isn't evicted.
- **Install prompt**: one-time banner on first visit — **Add to phone** (native `beforeinstallprompt` on Chrome/Edge; step-by-step Share → Add to Home Screen sheet on iOS Safari) or **Later**. Either choice is remembered (localStorage `gejfa-install-v1`); a quiet footer link remains for deciding later. Never shown in standalone mode; hidden permanently after `appinstalled`.
- **Deep-linkable filters and cards**: the category, search text, and the currently open card are all reflected in the URL (`?q=&cat=&doc=`) via `history.replaceState` (no history spam while typing), so a coach can share or bookmark the exact view they're looking at — including one specific rule or situation (`?doc=rule:II-9` / `?doc=sit:S-onside`). On load, `?doc=` takes over the view entirely (opens that one card, skips the generic list render).
- **Share button on every card**: each result's `.peek` row has a share icon (`shareDoc()` in app.js) that builds that card's `?doc=` link and either opens the native OS share sheet (`navigator.share`, used where available — free, no third-party service) or copies the link to the clipboard with an `infoToast` confirmation. No backend, no link shortener, no paid API.

## 9. Verification (required before any deploy)

1. `node --check` on every changed `.js` file.
2. **Run `node tests/verify-rules.js` — must exit 0.** This is the automated pre-deploy gate (not shipped to `docs/`, so it isn't part of the deployed bundle). It checks, against `rules_extracted.txt`:
   - **Structural integrity** — every situation `ruleId` and diagram key resolves to a real rule id, every quick-card id resolves, every rule has its required fields, categories/levels are valid, no duplicate ids. Counts are logged (81 rules / 45 situations / 31 diagrams / 8 quick, as of this writing — update the anchor/count expectations in the test file when these legitimately change).
   - **Source fidelity** — every rule's verbatim `text` field is checked for 4-word shingle overlap against the source; below `MIN_COVERAGE` (currently 0.30, calibrated against this dataset's most heavily-synthesized entry) fails loudly. This is the automated defense against hallucinated/invented rule text — a wholly fabricated sentence scores near 0%, since no 38-page rulebook contains a 4-word run matching an invented claim by chance.
   - **Anchor facts** — a curated list of the highest-stakes numbers (PAT values, weigh-in tolerance, the 25/32/38-point thresholds, appeal windows, practice limits, transfer caps, etc.), each checked explicitly against *both* the app data and the source text. Add an anchor here whenever a new rule carries a penalty, deadline, or threshold a coach would act on.
   - **Search behavior** — the top-hit gauntlet (mercy, up 30, late weigh in, 4th and 10, overtime, ejected, twelve plays, headsets, …).
   - This test suite is a **regression net, not a substitute** for the full semantic audit required on genuinely new rule content (a shingle/anchor check can't catch a subtly-wrong paraphrase that reuses the right words) — for new content, do the multi-agent adversarial audit against the source (§2.1's method) first, then run this suite to lock the result in against future drift.
3. Content changes: re-audit changed entries against `rules_extracted.txt`. For deep passes, cross-validate the extraction with a second PDF library (pypdf vs pdfminer numeric-token diff must be zero).
4. After push: confirm the live build flipped (poll a version-stamped asset).

## 10. Deploy & operations

- Push to `main`; GitHub Pages publishes `/docs` automatically (HTTPS, required for install).
- Repo auth: repo-local git config routes credentials through `gh`; switch `gh` to the `alienfacepalm` account for pushes, then back.
- **New season revision procedure** (how a new PDF becomes the new baseline): add the new season's PDF, re-extract with dual-library validation, re-curate `data/*.js` with a full 1:1 audit, **revise this SPEC.md** (year references, counts, any rule-structure changes) so it remains the governing document, update year branding (hero banner, manifest, icons, PDF link), bump `CACHE_VERSION`, verify (§9), push.

## 11. Known limits / future work

- Voice search requires a SpeechRecognition-capable browser (Android Chrome/Edge); iOS falls back to keyboard dictation.
- The Age/Weight Chart itself is referenced but not reproduced (it is a separate GEJFA document); entries cite it where relevant.
- Native port path: wrap `docs/` with Capacitor, or reuse `data/*` + `search.js` in React Native (diagrams would need an SVG host component).
