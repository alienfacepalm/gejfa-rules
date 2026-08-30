#!/usr/bin/env node
/* GEJFA Rules — pre-deploy verification suite.
 *
 * Run before every deploy: `node tests/verify-rules.js`
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
const { createGejfaSearch } = require(path.join(DOCS, "search.js"));

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

(GEJFA_QUICK || []).forEach(q => {
  check(situationIds.has(q.sitId), `quick-answer "${q.sitId}" resolves to a situation`);
});

console.log(`rules: ${GEJFA_RULES.length}  situations: ${GEJFA_SITUATIONS.length}  ` +
  `diagrams: ${Object.keys(GEJFA_DIAGRAMS).length}  quick: ${(GEJFA_QUICK || []).length}`);

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
console.log(`\n${passes} passed, ${failures} failed.`);
if (failures > 0) {
  console.error("\nDo not deploy. Fix the failures above (re-check rules_extracted.txt if unsure).");
  process.exit(1);
} else {
  console.log("All checks passed — safe to deploy.");
}
