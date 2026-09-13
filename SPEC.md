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
  flows.js                     pure guided-flow resolver: Score check arithmetic + rule selection (portable)
  data/rules.js                81 rule entries (portable, pure data)
  data/situations.js           45 situation cards + GEJFA_QUICK (9: 8 cards + the Score check flow) (portable)
  data/synonyms.js             coach-speak → rulebook-term expansion (portable)
  data/diagrams.js             31 chalk-style SVG builders keyed by rule id (portable)
  data/flows.js                guided-flow steps/options + 25 rule-cited callouts (portable, pure data)
  vendor/minisearch.min.js     MiniSearch v7 UMD (only dependency, vendored)
  fonts/*.woff2                Graduate 400; Barlow 400/600/700 (self-hosted)
  icons/*.png                  192 / 512 / 512-maskable (Spartans lockup)
  manifest.webmanifest         "Skyline Spartans — GEJFA Rules 2025" / "Spartans Rules"
  version.js                   GEJFA_VERSION — single source of truth for the build number (footer label + sw.js cache name)
  sw.js                        cache-first service worker; cache named from version.js
  2025-gejfa-rules.pdf         official rulebook (linked upper-right, precached)
tests/
  verify-rules.cjs             pre-deploy gate: structural + source-fidelity + anchor + search + flow-scenario tests (§9); NOT deployed (outside docs/)
src/                           TypeScript mirror of the data layer + `types.ts` contracts (typechecked by `pnpm typecheck`; not deployed — docs/ stays build-free)
scripts/
  readme-screenshots.mjs       `pnpm screenshots`: serves docs/, drives headless Chrome at phone width, rewrites screenshots/*.png for the README
screenshots/                   generated README images (committed; regenerated whenever a widget changes — §9.5)
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

`situations.js` — cards phrased the way a coach thinks (`question`, `answer`, `ruleId` link, `keywords`), ranked above raw rules. `GEJFA_QUICK` lists the one-tap Game Time tiles: 8 situation cards (`sitId`) plus the Score check flow (`flowId`).
`synonyms.js` — single-token map (e.g. `mercy → 32 point rule`).
`diagrams.js` — SVG string builders per rule id; every label/number sourced from the book.
`flows.js` (data) — **guided flows**: tap-through follow-up questions that resolve a live situation with no AI. `GEJFA_FLOWS` holds each flow's ordered `steps` (`kind: "score"` = two numeric fields; `kind: "choice"` = option buttons; `skipWhen` drops a step given another answer). `GEJFA_FLOW_CALLOUTS` is the table of rule-cited lines a result can show: `{ ruleId, tone: "stop" | "go" | "note", heading, text }`. Callout `text` is rulebook language (same fidelity bar as a rule's `text`, enforced by the shingle test) and is phrased team-neutrally ("the leading team" / "the trailing team"), exactly as the book phrases it; the status line says which one you are. The only flow today is `score` (steps: score → level → what's happening → quarter/time).
Categories (12) and levels (5: Rookie/Cub/Sophomore/JV/Varsity) are defined in `rules.js`.

## 5. Search behavior (`search.js`)

Ranking pipeline, in order:
1. **Intent patterns** — situational phrasings ("up 30", "down by 26", "4th and 10", "12 plays") expand the query toward the governing rule.
2. **Synonym expansion** — coach-speak tokens append rulebook terms.
3. **Number stripping** — standalone numeric tokens are removed from the indexed query (they are situational, and collide with numeric specs like ball sizes); intents carry their meaning.
4. **Precision pass** — multi-term queries run `combineWith: AND` first (×10 score boost).
5. **Recall pass** — expanded `OR` query fills in behind.

MiniSearch config: prefix + fuzzy(0.2); field boosts question 5 / title 4 / keywords 3.5 / answer 2 / text 0.6; situation docs ×1.4. The engine supports filtering by level (`all` or match) and category, but the UI only exposes the category filter — see §6 for why the level filter was removed. Empty query = browse (situations, then rules).

### 5.1 Guided-flow resolver (`flows.js`)

`createGejfaFlows({ flows, callouts, rules })` is a pure factory (no DOM) returning `steps`, `nextStep`, `cleanAnswers`, `resolve`, and `parseScoreQuery`. `resolve("score", { us, them, lvl, sit, time })` computes the call deterministically from the rulebook's literal thresholds — protocol at **25 or more** (`>= 25`), cap **more than 32** (`> 32`, so 32 exactly is legal), automatic margin-of-victory suspension **more than 38** (`> 38`) — and returns:
- `regime`: `normal` | `protocol` (25–32 ahead) | `over32` | `behind25`; `headroom` = 32 − lead (leading side).
- one scoring table: "If we score" (FG +3 / TD +6 / TD + run-pass PAT +7 / TD + kick PAT +8, per Part II §9) or, when the opponent has the ball, "If our defense scores" (safety +2 / defensive TD +6 / +7 / +8). Each row carries the lead after that score and `ok` (≤ 32) / `flag` (`over32` / `over38`). The FG row is omitted at Rookie (8-player has no field goal, §6.e) and a callout says so.
- `callouts[]`: the rules in effect for that regime × situation × time × level — e.g. leading with the ball at 25+: the at-or-inside-the-20 possession flip (§10.b(2)(d)), the back-to-own-20 spot (§10.b(2)(c); own 15 at Rookie, §6.h), league timeout (§10.b(1)), running clock (§10.b(2)(e)–(g)); trailing after a TD under 4:00: the onside alternative (§8.b) or, if still down 25+, the ball at the 50 (§8.b(1)); final: §10.c consequences and §10.d. Where the book is silent (a PAT after a defensive TD) the callout says so and points to NFHS (§1).
- `parseScoreQuery` recognises a typed score ("28-0", "28 to 0", "up 28", "down by 12") so the search view can offer the flow; "4th and 10" / "12 plays" never match.

The resolver never gives advice beyond the rule (it does not say "kick from the 21"); it states what the rule does and lets the coach decide.

## 6. UX

- **Hero** (scrolls away): DESIGN.md "Design 2" lockup — arched SKYLINE (Graduate), `SAMMAMISH [2025] WASHINGTON` banner, accent stripe, SPARTANS. **PDF** button upper-right opens the official rulebook in a new tab.
- **Sticky search row**: autofocus-free large input, clear ×, mic (Web Speech API where supported), ☰ category filter button, and an always-visible **reset-to-home** button (`#resetHomeBtn`, calls `resetAll()`). Tapping the header logo does the same thing, but that gesture alone isn't discoverable — a user reported clicking it by accident without realizing it was clickable — so a real, always-visible button is the primary affordance and the logo tap is a bonus.
- **Category filter**: the only filter (a level filter — Rookie/Cub/Sophomore/JV/Varsity — was removed; see below). `#browseBtn` (class `.level-btn`, a historical name — see docs/styles.css) shows the active category's name on the button itself (default "Topic"), opening a bottom sheet (2-column grid of 12 categories + "All topics"); Escape/overlay close; focus returned. Deliberately not framed as a "browse" menu: it only ever allows one selection, so it is a filter, styled and worded like one (no separate pill, no hamburger icon).
- **Why there's no level filter**: measured directly — for 11 of 12 categories, every level (All/Rookie/Cub/Sophomore/JV/Varsity) returned an identical result count, because almost all GEJFA rules apply to every level and multi-level facts (e.g. quarter lengths) are stored as one `levels: ["all"]` entry rather than split per level. Only the 8-Player category actually varied. A control that changes the result for one category out of twelve isn't worth the UI space, so it was removed rather than kept as a rarely-useful filter.
- **Results**: banner-bar count divider. Cards show **title + 2-line clamped answer at a glance**; tapping opens the topic in focus mode (accordion — one open, auto-scrolled under the search bar) revealing the full answer, the section diagram (when one exists), the citation badge, level tags, and the official rule text. Query terms are highlighted.
- **Best match**: with a non-empty query the top hit renders pre-opened with a "Best match" tag.
- **Zero-typing paths**: Game Time grid (Score check tile first, then 8 one-tap cards) and Recents (last 6 topics, localStorage) on the home state.
- **Score check (guided flow)**: born from a real game (up 28-0, "what can we still do?"). One screen rendered into `#results` like a topic: answered steps collapse to tappable chips (tap to change), the current step shows large option buttons or two big numeric fields (US / THEM, `inputmode="numeric"`), and once every applicable step is answered the call renders beneath: a status block (e.g. "UP 28 · 25-POINT PROTOCOL IN EFFECT · Up to 4 more points keeps the lead at or under 32"), the scoring table as spec-sheet stat rows (label ···· value, tagged OK / OVER 32; never filled bars), then callouts as cards with a STOP / OPTION / NOTE eyebrow. Every callout has a citation chip that expands the official rule text inline, plus "Open this rule" to jump to the rule card. Entry points: the Game Time tile, a launcher card that appears above search results when the query looks like a score (`parseScoreQuery`), and the `?flow=` deep link. "Share this check" shares the current URL. Typing in the search box, picking a category, opening a card, or reset all leave the flow.
- **Empty state**: suggests re-phrasing, drawer browse, and states the NFHS fallback.
- Quality floor: 40px+ touch targets, `:focus-visible`, `prefers-reduced-motion`, safe-area insets, `aria-expanded`/dialog semantics.

## 7. Visual system (per DESIGN.md)

Black chrome, green field, chalk print: the hero and sticky search bar are solid black (`--ink` #050705) — team chrome, distinct from the playing surface below; everything from the results area down sits on dark forest green (`--field` #16281c, raised #1f3627, pressed #28442f) with chalk white (#f5f3ec) and light-grey secondary (#b7c2b6) type. The green content area's background is a faint gridiron grid (yard-line/hash rules in `--field-press`, 48px spacing), not a flat fill. Display type Graduate (collegiate block serif); body Barlow. Banner bars and the horizontal stripe are the structural motifs. Diagrams are chalk-on-green (X's-and-O's vernacular). See DESIGN.md's Palette section for the full token table.

## 8. PWA behavior

- **Sync/offline model — deliberately cache-first, not network-first.** `sw.js` always answers from cache instantly, refreshing that cache from the network in the background on every request when online. A network-first strategy was considered and rejected: on the poor sideline connectivity this app is built for, network-first would make every lookup wait on a slow/failing request before falling back to a perfectly good local copy — exactly the failure mode the app exists to avoid. "Full sync when online, offline works with the latest cached version" is delivered instead through the service-worker *version* lifecycle (below), which the coach can see and act on explicitly, rather than by racing the network on every tap.
- `GEJFA_VERSION` in `version.js` must be bumped on every content/app change; `sw.js` derives `CACHE_VERSION` (`gejfa-rules-vN`) from it via `importScripts`, and `app.js` prints `vN` in the footer credit line so anyone can see which build a phone is running. The update lifecycle is fully visible to the coach:
  1. **First-ever visit**: once everything is actually cached (`serviceWorker.ready`), a status message confirms *"Rulebook saved for offline use ✓."*
  2. **While online and a new version is found**: a *"Downloading rulebook update…"* status message shows for the duration of the fetch (relevant on slow field connections; the PDF alone is ~480 KB).
  3. **Once the new version is ready** (`controllerchange`, i.e. an update — not the first install): an actionable `.toast` reads *"Rulebook updated — tap to reload."* (A fuller "What's new" changelog sheet was tried and removed at the user's request — kept simple.)
  4. Status messages (`.toast-info`) are non-interactive and auto-dismiss; the update toast (`.toast`) stays until tapped, since reloading is the coach's call to make on their own time.
- **Update check on every open.** `register()` only checks for a new `sw.js` on a fresh page load, but an installed PWA is usually *resumed* from the background rather than reloaded. `app.js` therefore calls `registration.update()` on load and again whenever the app becomes visible (`visibilitychange`), regains `focus`, or comes back `online` — throttled to once per 60 s — plus a daily timer for a session left open for days. A found update flows through the visible lifecycle above.
- **Background sync every 24 h.** `app.js` registers a Periodic Background Sync (tag `gejfa-rulebook-sync`, `minInterval` 24 h) when the `periodic-background-sync` permission is granted (Chrome/Edge, installed PWA; the browser sets the real cadence — `minInterval` is a floor). `sw.js` handles `periodicsync` by (1) calling `registration.update()` so a bumped `GEJFA_VERSION` installs while the app is closed, and (2) re-fetching every `ASSETS` entry with `cache: "no-cache"` into the current cache (`Promise.allSettled` — a failed fetch leaves the existing cached copy in place). Browsers without the API (iOS Safari, Firefox) are covered by the on-open check.
- `navigator.storage.persist()` requested so the offline cache isn't evicted.
- **Install prompt**: one-time banner on first visit — **Add to phone** (native `beforeinstallprompt` on Chrome/Edge; step-by-step Share → Add to Home Screen sheet on iOS Safari) or **Later**. Either choice is remembered (localStorage `gejfa-install-v1`); a quiet footer link remains for deciding later. Never shown in standalone mode; hidden permanently after `appinstalled`.
- **Deep-linkable filters, cards, and flows**: the category, search text, and the currently open card are all reflected in the URL (`?q=&cat=&doc=`) via `history.replaceState` (no history spam while typing), so a coach can share or bookmark the exact view they're looking at — including one specific rule or situation (`?doc=rule:II-9` / `?doc=sit:S-onside`). A guided flow is likewise fully in the URL: `?flow=score&us=28&them=0&lvl=varsity&sit=ball-us&time=q4` reproduces a finished Score check, and a partial one (`?flow=score&us=28&them=0`) reopens at the next unanswered step; unknown values are dropped by `cleanAnswers`. On load, `?flow=` (then `?doc=`) takes over the view entirely (skips the generic list render).
- **Share button on every card**: each result's `.peek` row has a share icon (`shareDoc()` in app.js) that builds that card's `?doc=` link and either opens the native OS share sheet (`navigator.share`, used where available — free, no third-party service) or copies the link to the clipboard with an `infoToast` confirmation. No backend, no link shortener, no paid API.

## 9. Verification (required before any deploy)

1. `node --check` on every changed `.js` file; `pnpm typecheck` when `src/` changed.
2. **Run `pnpm test` (`node tests/verify-rules.cjs`) — must exit 0.** This is the automated pre-deploy gate (not shipped to `docs/`, so it isn't part of the deployed bundle). It checks, against `rules_extracted.txt`:
   - **Structural integrity** — every situation `ruleId` and diagram key resolves to a real rule id, every quick-tile id resolves (situation or flow), every rule has its required fields, categories/levels are valid, no duplicate ids; flow steps/options are well-formed, flow level options are real levels, every flow callout cites a real rule. Counts are logged (81 rules / 45 situations / 31 diagrams / 9 quick / 1 flow / 25 callouts, as of this writing — update the anchor/count expectations in the test file when these legitimately change).
   - **Source fidelity** — every rule's verbatim `text` field, and every flow callout's `text`, is checked for 4-word shingle overlap against the source; below `MIN_COVERAGE` (currently 0.30, calibrated against this dataset's most heavily-synthesized entry) fails loudly. This is the automated defense against hallucinated/invented rule text — a wholly fabricated sentence scores near 0%, since no 38-page rulebook contains a 4-word run matching an invented claim by chance. The only callouts exempt are the two declared synthesized notes (`nfhs`, `pat-after-def-td`), listed by name in the test.
   - **Anchor facts** — a curated list of the highest-stakes numbers (PAT values, weigh-in tolerance, the 25/32/38-point thresholds, appeal windows, practice limits, transfer caps, etc.), each checked explicitly against *both* the app data and the source text — for rules and for flow callouts. Add an anchor here whenever a new rule carries a penalty, deadline, or threshold a coach would act on.
   - **Search behavior** — the top-hit gauntlet (mercy, up 30, late weigh in, 4th and 10, overtime, ejected, twelve plays, headsets, …).
   - **Score check scenario gauntlet** — the flow resolver pinned scenario by scenario (28-0 Varsity and Rookie with the ball; 24-0 / 26-0 / 32-0 / 33-0 / 39-0 thresholds; 25-0 in the 4th vs. 2nd quarter; 30-0 / 31-0 / 26-0 with the opponent in possession; 28-11 after a score; 6-28 and 6-31 after a late TD; 0-30 at the half; final 40-0 / 30-0 / 0-33), plus step-skipping, answer cleaning, and typed-score recognition. Add a scenario whenever a flow branch is added or changed.
   - This test suite is a **regression net, not a substitute** for the full semantic audit required on genuinely new rule content (a shingle/anchor check can't catch a subtly-wrong paraphrase that reuses the right words) — for new content, do the multi-agent adversarial audit against the source (§2.1's method) first, then run this suite to lock the result in against future drift.
3. Content changes: re-audit changed entries against `rules_extracted.txt`. For deep passes, cross-validate the extraction with a second PDF library (pypdf vs pdfminer numeric-token diff must be zero).
4. After push: confirm the live build flipped (poll `version.js` until it serves the new `GEJFA_VERSION`).
5. **README screenshots stay current.** Whenever a widget (a Game Time tile, a guided flow, a card type, the search row) is added or visibly changed: add or update its entry in the `SHOTS` list of `scripts/readme-screenshots.mjs`, run `pnpm screenshots`, check the PNGs, and commit them in the same change. The README's Screenshots section references those files by name, so a new widget without a screenshot entry is a doc gap. Shots load the app with `?shot=1`, which `app.js` reads once at startup (`SHOT_MODE`) to suppress the first-visit install banner and the service-worker status toasts; the flag is never written back into the synced URL and has no other effect.

## 10. Deploy & operations

- Push to `main`; GitHub Pages publishes `/docs` automatically (HTTPS, required for install).
- Repo auth: repo-local git config routes credentials through `gh`; switch `gh` to the `alienfacepalm` account for pushes, then back.
- **New season revision procedure** (how a new PDF becomes the new baseline): add the new season's PDF, re-extract with dual-library validation, re-curate `data/*.js` with a full 1:1 audit, **revise this SPEC.md** (year references, counts, any rule-structure changes) so it remains the governing document, update year branding (hero banner, manifest, icons, PDF link), bump `GEJFA_VERSION` in `version.js`, verify (§9), push.

## 11. Known limits / future work

- Voice search requires a SpeechRecognition-capable browser (Android Chrome/Edge); iOS falls back to keyboard dictation.
- The Age/Weight Chart itself is referenced but not reproduced (it is a separate GEJFA document); entries cite it where relevant.
- Native port path: wrap `docs/` with Capacitor, or reuse `data/*` + `search.js` in React Native (diagrams would need an SVG host component).
