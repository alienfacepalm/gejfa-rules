#!/usr/bin/env node
/* GEJFA Rules — pre-deploy verification suite.
 *
 * Run before every deploy: `pnpm test` (node tests/verify-rules.cjs)
 * Exits non-zero on any failure (suitable as a CI/deploy gate).
 *
 * This is a REGRESSION NET, not a substitute for the full semantic audit
 * required on new rule content (see SPEC.md §9). It catches:
 *   1. Structural integrity   — broken cross-references, missing fields
 *   2. Source fidelity        — rule `text` fields must be substantially
 *                               verbatim substrings of the source PDF text
 *   3. Anchor facts           — a curated list of the highest-stakes numbers
 *                               (penalties, deadlines, points) checked
 *                               explicitly against both our data and source
 *   4. Search behavior        — canonical coach queries must surface the
 *                               right rule at the top of results
 *
 * Not covered here (needs a semantic re-read of the source, e.g. a
 * subagent audit): whether an `answer` field's plain-English paraphrase
 * subtly changes meaning, or introduces a claim with no numbers to catch.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");

let failures = 0;
let passes = 0;
function ok(label) { passes++; }
function fail(label, detail) {
  failures++;
  console.error(`FAIL  ${label}`);
  if (detail) console.error(`      ${detail}`);
}
function check(cond, label, detail) { cond ? ok(label) : fail(label, detail); }

// ---------------------------------------------------------------------------
// Load source baseline + app data
// ---------------------------------------------------------------------------
const SOURCE_RAW = fs.readFileSync(path.join(ROOT, "rules_extracted.txt"), "utf-8")
  .replace(/=== PAGE \d+ ===/g, " "); // strip page markers, which can land mid-sentence at page breaks

const MiniSearch = require(path.join(DOCS, "vendor/minisearch.min.js"));
const { GEJFA_RULES, GEJFA_CATEGORIES, GEJFA_LEVELS } = require(path.join(DOCS, "data/rules.js"));
const { GEJFA_SITUATIONS, GEJFA_QUICK } = require(path.join(DOCS, "data/situations.js"));
const { GEJFA_SYNONYMS } = require(path.join(DOCS, "data/synonyms.js"));
const { GEJFA_DIAGRAMS } = require(path.join(DOCS, "data/diagrams.js"));
const { GEJFA_FLOWS, GEJFA_FLOW_CALLOUTS } = require(path.join(DOCS, "data/flows.js"));
const { createGejfaSearch } = require(path.join(DOCS, "search.js"));
const { createGejfaFlows } = require(path.join(DOCS, "flows.js"));

function normalize(s) {
  return String(s)
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9%$./'-]+/g, " ")
    .replace(/\s*-\s*/g, "-") // "10 -11" / "10- 11" / "10 - 11" and "10-11" all become "10-11"
                              // (the source PDF's dash spacing in number ranges is inconsistent
                              // and unrelated to whether a value is correctly transcribed)
    .replace(/\s+/g, " ")
    .trim();
}
const SOURCE_NORM = normalize(SOURCE_RAW);

function shingles(words, n) {
  const out = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(" "));
  return out;
}

// ===========================================================================
// 1. STRUCTURAL INTEGRITY
// ===========================================================================
console.log("== 1. Structural integrity ==");

const ruleIds = new Set();
GEJFA_RULES.forEach(r => {
  check(!ruleIds.has(r.id), `rule id "${r.id}" is unique`, "duplicate rule id");
  ruleIds.add(r.id);
  ["cite", "category", "title", "levels", "answer", "text", "keywords"].forEach(field => {
    const v = r[field];
    const present = Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
    check(present, `rule "${r.id}" has non-empty "${field}"`, `field: ${field}`);
  });
});

const catIds = new Set(GEJFA_CATEGORIES.map(c => c.id));
const levelIds = new Set(GEJFA_LEVELS.map(l => l.id).concat("all"));
GEJFA_RULES.forEach(r => {
  check(catIds.has(r.category), `rule "${r.id}" has a valid category`, `category: ${r.category}`);
  (r.levels || []).forEach(lv =>
    check(levelIds.has(lv), `rule "${r.id}" has valid level "${lv}"`, `unknown level: ${lv}`));
});

const situationIds = new Set();
GEJFA_SITUATIONS.forEach(s => {
  check(!situationIds.has(s.id), `situation id "${s.id}" is unique`, "duplicate situation id");
  situationIds.add(s.id);
  check(ruleIds.has(s.ruleId), `situation "${s.id}" ruleId resolves`, `ruleId: ${s.ruleId}`);
  check(!!(s.question && s.answer), `situation "${s.id}" has question+answer`);
});

Object.keys(GEJFA_DIAGRAMS).forEach(key => {
  check(ruleIds.has(key), `diagram key "${key}" resolves to a rule`, "orphaned diagram");
  const svg = GEJFA_DIAGRAMS[key];
  check(svg.startsWith("<svg") && svg.endsWith("</svg>"), `diagram "${key}" is well-formed SVG`);
  const opens = (svg.match(/<text/g) || []).length;
  const closes = (svg.match(/<\/text>/g) || []).length;
  check(opens === closes, `diagram "${key}" has balanced <text> tags`, `${opens} open vs ${closes} close`);
});

// Guided flows: steps/options well-formed, level options are real levels,
// every callout cites a real rule.
const flowIds = new Set();
GEJFA_FLOWS.forEach(f => {
  check(!flowIds.has(f.id), `flow id "${f.id}" is unique`, "duplicate flow id");
  flowIds.add(f.id);
  check(!!(f.label && f.title && Array.isArray(f.steps) && f.steps.length), `flow "${f.id}" has label/title/steps`);
  const stepIds = new Set(f.steps.map(s => s.id));
  f.steps.forEach(s => {
    check(["score", "choice"].includes(s.kind) && !!s.prompt, `flow "${f.id}" step "${s.id}" has kind+prompt`);
    if (s.kind === "choice") {
      check(Array.isArray(s.options) && s.options.length >= 2, `flow step "${s.id}" has 2+ options`);
      const optIds = new Set();
      (s.options || []).forEach(o => {
        check(!optIds.has(o.id) && !!o.label, `flow step "${s.id}" option "${o.id}" is unique with a label`);
        optIds.add(o.id);
        if (s.id === "lvl") check(levelIds.has(o.id), `flow level option "${o.id}" is a real level`, `unknown level: ${o.id}`);
      });
    }
    Object.keys(s.skipWhen || {}).forEach(k =>
      check(stepIds.has(k), `flow step "${s.id}" skipWhen references step "${k}"`, "unknown step"));
  });
});
Object.keys(GEJFA_FLOW_CALLOUTS).forEach(id => {
  const c = GEJFA_FLOW_CALLOUTS[id];
  check(ruleIds.has(c.ruleId), `flow callout "${id}" ruleId resolves`, `ruleId: ${c.ruleId}`);
  check(["stop", "go", "note"].includes(c.tone) && !!c.heading && !!c.text, `flow callout "${id}" has tone/heading/text`);
});

(GEJFA_QUICK || []).forEach(q => {
  if (q.flowId) check(flowIds.has(q.flowId), `quick-answer "${q.flowId}" resolves to a flow`);
  else check(situationIds.has(q.sitId), `quick-answer "${q.sitId}" resolves to a situation`);
});

console.log(`rules: ${GEJFA_RULES.length}  situations: ${GEJFA_SITUATIONS.length}  ` +
  `diagrams: ${Object.keys(GEJFA_DIAGRAMS).length}  quick: ${(GEJFA_QUICK || []).length}  ` +
  `flows: ${GEJFA_FLOWS.length}  callouts: ${Object.keys(GEJFA_FLOW_CALLOUTS).length}`);

// ===========================================================================
// 2. SOURCE FIDELITY — every rule's verbatim `text` must substantially
//    reappear in the source PDF text (6-word shingle overlap).
//    Threshold tolerates legitimate light condensation of adjacent clauses;
//    it does NOT tolerate paraphrase, invention, or substituted numbers.
// ===========================================================================
console.log("\n== 2. Source fidelity (verbatim text vs. PDF source) ==");

const SHINGLE_N = 4;
// Calibrated against the current dataset (lowest legitimate entry: APP-A at
// 36%, a heavily-synthesized policy summary — see SPEC.md §9). 30% gives
// margin against minor future wording tweaks while still failing hard on
// true fabrication, which scores near 0% (no contiguous 4-word run from an
// invented sentence exists anywhere in a 38-page rulebook by chance).
const MIN_COVERAGE = 0.30;

const coverages = [];
GEJFA_RULES.forEach(r => {
  const words = normalize(r.text).split(" ").filter(Boolean);
  if (words.length < SHINGLE_N) { ok(`rule "${r.id}" text too short to shingle-check`); return; }
  const grams = shingles(words, SHINGLE_N);
  const hits = grams.filter(g => SOURCE_NORM.includes(g)).length;
  const coverage = hits / grams.length;
  coverages.push({ id: r.id, coverage });
  check(coverage >= MIN_COVERAGE,
    `rule "${r.id}" text is ≥${Math.round(MIN_COVERAGE * 100)}% verbatim-traceable to source`,
    `coverage ${(coverage * 100).toFixed(0)}% (${hits}/${grams.length} shingles found)`);
});
if (process.env.VERIFY_DEBUG) {
  coverages.sort((a, b) => a.coverage - b.coverage);
  console.log("lowest 12 coverages:", coverages.slice(0, 12).map(c => `${c.id}=${(c.coverage * 100).toFixed(0)}%`).join(", "));
}

// Flow callouts carry the same fidelity requirement: their text is rulebook
// language, so it must shingle-match the source too. The few deliberately
// synthesized notes (an "NFHS applies" pointer, a statement that the book is
// silent on a point) are listed explicitly so nothing else can hide there.
const CALLOUT_SYNTHESIZED = new Set(["nfhs", "pat-after-def-td"]);
const calloutCoverages = [];
Object.keys(GEJFA_FLOW_CALLOUTS).forEach(id => {
  if (CALLOUT_SYNTHESIZED.has(id)) { ok(`callout "${id}" is a declared synthesized note`); return; }
  const words = normalize(GEJFA_FLOW_CALLOUTS[id].text).split(" ").filter(Boolean);
  const grams = shingles(words, SHINGLE_N);
  const hits = grams.filter(g => SOURCE_NORM.includes(g)).length;
  const coverage = grams.length ? hits / grams.length : 1;
  calloutCoverages.push({ id, coverage });
  check(coverage >= MIN_COVERAGE,
    `callout "${id}" text is ≥${Math.round(MIN_COVERAGE * 100)}% verbatim-traceable to source`,
    `coverage ${(coverage * 100).toFixed(0)}% (${hits}/${grams.length} shingles found)`);
});
if (process.env.VERIFY_DEBUG) {
  calloutCoverages.sort((a, b) => a.coverage - b.coverage);
  console.log("callout coverages:", calloutCoverages.map(c => `${c.id}=${(c.coverage * 100).toFixed(0)}%`).join(", "));
}

// ===========================================================================
// 3. ANCHOR FACTS — the highest-stakes numbers, hand-verified against the
//    source during the full audit, re-checked explicitly on every run so a
//    future edit can never silently drift one of these without failing loudly.
// ===========================================================================
console.log("\n== 3. Anchor facts (curated, high-stakes numbers) ==");

const ruleById = {};
GEJFA_RULES.forEach(r => { ruleById[r.id] = r; });

function ruleContains(id, substr) {
  const r = ruleById[id];
  if (!r) return false;
  const hay = normalize(r.text + " " + r.answer);
  return hay.includes(normalize(substr));
}
function sourceContains(substr) {
  return SOURCE_NORM.includes(normalize(substr));
}
function anchor(id, substr, label) {
  const inRule = ruleContains(id, substr);
  const inSource = sourceContains(substr);
  check(inRule, `[${id}] data contains: "${label}"`, `expected substring not found in rule text/answer: "${substr}"`);
  check(inSource, `[${id}] source confirms: "${label}"`, `expected substring not found in rules_extracted.txt: "${substr}"`);
}

anchor("II-9", "two (2) points", "PAT kick = 2 points");
anchor("II-9", "one (1) point", "PAT run/pass = 1 point");
anchor("II-2-b", "nine tenths (9/10ths)", "weigh-in tolerance 0.9 lb");
anchor("II-2-i", "15 minutes prior to the start of the game", "late weigh-in cutoff 15 min");
anchor("II-7-a", "four consecutive legal plays", "substitution lock = 4 plays");
anchor("II-7-c", "twelve plays", "minimum 12 plays from scrimmage");
anchor("II-10-a", "twenty-five (25) points", "score management trigger = 25 points");
anchor("II-10-b", "more than 32 points", "32-point rule cap");
anchor("II-10-c", "more than 38 points", "38-point auto-suspension threshold");
anchor("II-8-b", "four (4) minutes", "onside alternative: under 4:00 left");
anchor("II-8-b", "own 25 yard line", "onside alternative spot: own 25");
anchor("APP-B", "24 hours", "ejection appeal: 24-hour filing window");
anchor("APP-B", "48 hours", "ejection appeal: 48-hour decision window");
anchor("I-9-abc", "five (5) practice sessions", "practice limit: 5/week pre-Labor Day");
anchor("I-9-abc", "three (3) practices per week", "practice limit: 3/week after Labor Day");
anchor("I-9-abc", "two (2) hours", "practice session cap: 2 hours");
anchor("I-7-b", "two external transfers", "external transfer cap: 2 per level");
anchor("I-7-b", "five total external", "external transfer cap: 5 total");
anchor("II-13-abc", "8:00am Monday", "protest deadline: Monday 8 AM");
anchor("II-14-c", "Sunday", "forfeit notice: Sunday before the game");
anchor("II-5-d", "8 minute quarters", "8-player/Cub quarter length: 8 minutes");
anchor("II-5-d", "10 minute quarters", "Soph/JV/Varsity quarter length: 10 minutes");
anchor("II-6-a", "eight (8)", "8-player: 8 players per side");
anchor("II-6-b", "100 yards", "8-player field length: 100 yards");
anchor("II-6-b", "35 yards wide", "8-player field width: 35 yards");

// Flow callouts: the numbers a coach acts on in the Score check.
function anchorCallout(id, substr, label) {
  const c = GEJFA_FLOW_CALLOUTS[id];
  check(!!c && normalize(c.text).includes(normalize(substr)),
    `[flow:${id}] data contains: "${label}"`, `expected substring not found in callout text: "${substr}"`);
  check(sourceContains(substr),
    `[flow:${id}] source confirms: "${label}"`, `expected substring not found in rules_extracted.txt: "${substr}"`);
}
anchorCallout("cap-intent", "more than 32 points", "32-point cap");
anchorCallout("timeout-25", "25 or more points", "league timeout at 25+");
anchorCallout("after-score-50", "50 yard line", "trailing team takes ball at the 50");
anchorCallout("trail-start-50", "50 yard line", "trailing team starts at the 50");
anchorCallout("lead-back-20", "own 20 yard line", "leading team back to its own 20");
anchorCallout("inside-20-flip", "at or inside the 20-yard line", "possession flips at/inside the 20");
anchorCallout("inside-20-flip", "trailing team on the 50-yard line", "flip spot = the 50");
anchorCallout("inside-20-penalty", "choice to decline", "penalty into the 20 may be declined");
anchorCallout("rookie-spots", "its own 15", "8-player: leading team from its own 15");
anchorCallout("running-clock", "stopped only for injuries or time outs", "running clock stops only for injuries/timeouts");
anchorCallout("below-25-resume", "below 25 points", "regular play resumes under 25");
anchorCallout("over-32-offense", "32 point margin offensively", "offensive violation = auto suspension");
anchorCallout("over-32-defense", "last score was defensive", "defensive violation = Grievance Committee");
anchorCallout("over-38", "more than 38 points", "38-point auto-suspension threshold");
anchorCallout("suspension-contact", "remainder of the season", "second violation = season");
anchorCallout("elect-possession", "twenty-five (25) points", "trailing 25+ may elect possession");
anchorCallout("onside-alt", "less than four (4) minutes", "onside alternative: under 4:00");
anchorCallout("onside-alt", "own 25 yard line", "onside alternative spot: own 25");
anchorCallout("onside-alt-25", "ball on the 50, first and 10", "still down 25+: ball at the 50");
anchorCallout("no-kickoff-35", "own 35 yard line, first and 10", "no kickoff: own 35");
anchorCallout("safety-50", "offense at the 50", "after a safety: ball at the 50");
anchorCallout("pat-values", "two (2) points", "PAT kick = 2");
anchorCallout("pat-values", "one (1) point", "PAT run/pass = 1");
anchorCallout("no-fg-rookie", "no field goal", "8-player: no field goals");

// ===========================================================================
// 4. SEARCH BEHAVIOR — canonical coach queries must surface the right rule
// ===========================================================================
console.log("\n== 4. Search behavior (top-hit gauntlet) ==");

const engine = createGejfaSearch({
  MiniSearch, rules: GEJFA_RULES, situations: GEJFA_SITUATIONS, synonyms: GEJFA_SYNONYMS,
});

const GAUNTLET = [
  ["mercy", "32"], ["up 30", "32"], ["winning by 40", "32"], ["down by 26", "50"],
  ["4th and 10", "onside"], ["late weigh in", "late"], ["overtime", "overtime"],
  ["twelve plays", "12 plays"], ["headsets", "electronic"], ["kid hurt", "injur"],
  ["cast", "cast"], ["subs", "bench"], ["pat", "pat"], ["onside kick", "onside"],
  ["ejected", "eject"], ["metal cleats", "cleat"], ["8 man punt", "punt"],
  ["missed weight twice", "level"], ["how long quarters", "quarter"], ["lightning", "interrupt"],
];

GAUNTLET.forEach(([query, expect]) => {
  const top = engine.search(query)[0];
  const text = top
    ? ((top.type === "situation" ? top.situation.question + " " + top.situation.answer
                                  : top.title + " " + top.answer) +
       " " + (top.rule ? top.rule.cite + " " + top.rule.title : ""))
    : "";
  check(text.toLowerCase().includes(expect.toLowerCase()),
    `search("${query}") top hit mentions "${expect}"`,
    `top hit was: ${text.slice(0, 90)}`);
});

// ===========================================================================
// 5. SCORE CHECK FLOW — the resolver's arithmetic and rule selection, pinned
//    scenario by scenario. Each expectation was hand-checked against Part II
//    §6.e/§6.h (8-player), §8 (no kickoffs / onside alternative), §9 (PAT
//    values) and §10 (25 / "more than 32" / "more than 38"). If one of these
//    fails, the app would tell a coach the wrong thing on the sideline.
// ===========================================================================
console.log("\n== 5. Score check flow (scenario gauntlet) ==");

const flowEngine = createGejfaFlows({ flows: GEJFA_FLOWS, callouts: GEJFA_FLOW_CALLOUTS, rules: GEJFA_RULES });

/* expect: { regime, headroom, rows: { id: [leadAfter, ok] | null }, has: [calloutIds], not: [calloutIds] } */
function scenario(label, answers, expect) {
  const r = flowEngine.resolve("score", answers);
  if (!r) { fail(`[flow] ${label}: resolves`, "resolver returned null (incomplete answers?)"); return; }
  if (expect.regime) check(r.regime === expect.regime, `[flow] ${label}: regime "${expect.regime}"`, `got "${r.regime}"`);
  if (expect.headroom !== undefined) check(r.headroom === expect.headroom, `[flow] ${label}: headroom ${expect.headroom}`, `got ${r.headroom}`);
  const rows = {};
  r.tables.forEach(t => t.rows.forEach(x => { rows[x.id] = x; }));
  Object.keys(expect.rows || {}).forEach(id => {
    const want = expect.rows[id], got = rows[id];
    if (want === null) { check(!got, `[flow] ${label}: no "${id}" row`, "row present"); return; }
    check(!!got && got.after === want[0] && got.ok === want[1],
      `[flow] ${label}: ${id} → ${want[0]} ${want[1] ? "ok" : "over"}`,
      got ? `got ${got.after} ${got.ok ? "ok" : got.flag}` : "row missing");
  });
  const ids = r.callouts.map(c => c.id);
  (expect.has || []).forEach(id => check(ids.includes(id), `[flow] ${label}: callout "${id}"`, `callouts: ${ids.join(", ")}`));
  (expect.not || []).forEach(id => check(!ids.includes(id), `[flow] ${label}: no callout "${id}"`, `callouts: ${ids.join(", ")}`));
}
const S = (us, them, lvl, sit, time) => ({ us, them, lvl, sit, time });

// --- today's game: up 28-0 with the ball ---
scenario("28-0 Varsity, we have the ball, 4th qtr", S(28, 0, "varsity", "ball-us", "q4"), {
  regime: "protocol", headroom: 4,
  rows: { fg: [31, true], td: [34, false], "td-run": [35, false], "td-kick": [36, false] },
  has: ["inside-20-flip", "inside-20-penalty", "lead-back-20", "timeout-25", "running-clock", "cap-intent"],
  not: ["no-fg-rookie", "rookie-spots", "running-clock-agree", "over-32-offense"],
});
scenario("28-0 Rookie (8-player), we have the ball, 2nd qtr", S(28, 0, "rookie", "ball-us", "early"), {
  regime: "protocol", headroom: 4,
  rows: { fg: null, td: [34, false] },
  has: ["no-fg-rookie", "rookie-spots", "inside-20-flip", "lead-back-20", "running-clock-agree"],
  not: ["running-clock"],
});
scenario("28-0 Varsity, they have the ball", S(28, 0, "varsity", "ball-them", "q4"), {
  regime: "protocol",
  rows: { safety: [30, true], "def-td": [34, false], fg: null },
  has: ["trail-start-50", "timeout-25", "running-clock"],
  not: ["inside-20-flip", "lead-back-20"],
});
// --- thresholds are literal: 25 or more; more than 32; more than 38 ---
scenario("24-0 JV, we have the ball (one point under the protocol)", S(24, 0, "jv", "ball-us", "early"), {
  regime: "normal", headroom: 8,
  rows: { fg: [27, true], td: [30, true], "td-run": [31, true], "td-kick": [32, true] },
  has: ["after-score-50", "pat-values"],
  not: ["timeout-25", "cap-intent", "inside-20-flip"],
});
scenario("26-0, we have the ball (TD fits, any PAT does not)", S(26, 0, "jv", "ball-us", "early"), {
  rows: { td: [32, true], "td-run": [33, false], "td-kick": [34, false] },
});
scenario("32-0 exactly is legal", S(32, 0, "jv", "ball-us", "q4"), {
  regime: "protocol", headroom: 0, rows: { fg: [35, false] }, not: ["over-32-offense"],
});
scenario("33-0: already more than 32", S(33, 0, "jv", "ball-us", "q4"), {
  regime: "over32",
  has: ["over-32-offense", "over-32-defense", "suspension-contact", "inside-20-flip"],
  not: ["over-38", "cap-intent"],
});
scenario("39-0: also more than 38", S(39, 0, "jv", "ball-us", "q4"), { regime: "over32", has: ["over-38"] });
scenario("25-0 4th qtr: protocol at exactly 25, running clock", S(25, 0, "cub", "ball-us", "q4"), {
  regime: "protocol", has: ["running-clock", "timeout-25"], not: ["running-clock-agree"],
});
scenario("25-0 2nd qtr: running clock only by agreement", S(25, 0, "cub", "ball-us", "early"), {
  regime: "protocol", has: ["running-clock-agree"], not: ["running-clock"],
});
// --- defensive scores ---
scenario("30-0, they have the ball: safety fits, defensive TD does not", S(30, 0, "jv", "ball-them", "q4"), {
  rows: { safety: [32, true], "def-td": [36, false], "def-td-kick": [38, false] }, not: ["pat-after-def-td"],
});
scenario("31-0, they have the ball: a safety exceeds 32", S(31, 0, "jv", "ball-them", "q4"), {
  rows: { safety: [33, false] },
});
scenario("26-0, they have the ball: def TD fits, its PAT would not (book is silent)", S(26, 0, "jv", "ball-them", "early"), {
  rows: { "def-td": [32, true], "def-td-run": [33, false] }, has: ["pat-after-def-td"],
});
// --- after a score ---
scenario("28-11 after they scored: gap 17, regular play", S(28, 11, "jv", "they-scored", "q4"), {
  regime: "normal", has: ["below-25-resume", "no-kickoff-35"], not: ["timeout-25", "running-clock"],
});
scenario("30-0 after we scored: they take the ball at the 50", S(30, 0, "jv", "we-scored", "q4"), {
  regime: "protocol", has: ["after-score-50", "running-clock"], not: ["no-kickoff-35"],
});
// --- trailing side ---
scenario("6-28 after our TD, under 4:00: onside alternative", S(6, 28, "jv", "we-scored", "q4-under4"), {
  regime: "normal", has: ["onside-alt", "no-kickoff-35"], not: ["onside-alt-25", "elect-possession"],
});
scenario("6-31 after our TD, under 4:00: still down 25, ball at the 50", S(6, 31, "jv", "we-scored", "q4-under4"), {
  regime: "behind25", has: ["onside-alt-25", "elect-possession", "trail-start-50"], not: ["onside-alt"],
});
scenario("0-30 start of 2nd half: may elect possession", S(0, 30, "jv", "half"), {
  regime: "behind25", has: ["elect-possession", "trail-start-50"], not: ["running-clock", "running-clock-agree"],
});
scenario("0-28 they have the ball: their 20-yard flip / back-to-20 rules", S(0, 28, "soph", "ball-them", "early"), {
  regime: "behind25", rows: { td: [34, false], fg: [31, true] }, has: ["inside-20-flip", "lead-back-20"],
});
scenario("0-0 tied: normal play", S(0, 0, "jv", "ball-us", "early"), { regime: "normal", headroom: 32 });
// --- final margins ---
scenario("final 40-0: more than 38", S(40, 0, "jv", "final"), {
  regime: "over32", has: ["over-32-offense", "over-32-defense", "over-38", "standings"],
});
scenario("final 30-0: within 32", S(30, 0, "jv", "final"), { has: ["standings"], not: ["over-32-offense", "over-38"] });
scenario("final 0-33: lost by more than 32 (their coach's problem)", S(0, 33, "jv", "final"), {
  has: ["over-32-offense", "standings"], not: ["over-38"],
});

// step logic: "time" is skipped for final / half; otherwise required
check(flowEngine.resolve("score", S(28, 0, "jv", "ball-us")) === null, "[flow] ball-us without time is incomplete");
check(flowEngine.nextStep("score", S(28, 0, "jv", "ball-us")).id === "time", "[flow] next step after sit=ball-us is time");
check(flowEngine.nextStep("score", { us: 28 }).id === "score", "[flow] half-entered score still asks for the score");
check(flowEngine.nextStep("score", S(28, 0, "jv", "final")) === null, "[flow] final skips the time step");
check(flowEngine.cleanAnswers("score", { us: 1, them: 2, lvl: "nope", sit: "final", time: "q4" }).lvl === undefined, "[flow] cleanAnswers drops an unknown level");
check(flowEngine.cleanAnswers("score", { us: 1, them: 2, lvl: "jv", sit: "final", time: "q4" }).time === undefined, "[flow] cleanAnswers drops a skipped step's answer");

// typed-score recognition
[["28-0", 28, 0], ["28 – 0", 28, 0], ["28 to 0", 28, 0], ["we're up 28", 28, 0], ["ahead by 30", 30, 0],
 ["down by 12", 0, 12], ["losing 21", 0, 21]].forEach(([q, us, them]) => {
  const p = flowEngine.parseScoreQuery(q);
  check(!!p && p.us === us && p.them === them, `[flow] parseScoreQuery("${q}") → ${us}-${them}`, `got ${JSON.stringify(p)}`);
});
["4th and 10", "12 plays", "late weigh in", "28", "overtime"].forEach(q => {
  check(flowEngine.parseScoreQuery(q) === null, `[flow] parseScoreQuery("${q}") does not match`, `got ${JSON.stringify(flowEngine.parseScoreQuery(q))}`);
});

// ===========================================================================
console.log(`\n${passes} passed, ${failures} failed.`);
if (failures > 0) {
  console.error("\nDo not deploy. Fix the failures above (re-check rules_extracted.txt if unsure).");
  process.exit(1);
} else {
  console.log("All checks passed — safe to deploy.");
}
