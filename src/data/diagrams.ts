/* GEJFA rule diagrams — chalkboard-style SVGs keyed by rule id.
   Pure JS string builders: no DOM APIs, portable to a native port.
   Styling comes from CSS classes on the host page (.dgm-*). */

import type { TDiagramMap } from "../types.js";

const W = 340;

function svgWrap(inner: string, h: number): string {
  return `<svg viewBox="0 0 ${W} ${h}" class="dgm" role="img" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

interface IFieldMarker { yard: number; label: string; sub?: string; }
interface IFieldArrow { from: number; to: number; label?: string; }
interface IFieldStripOpts { markers?: IFieldMarker[]; arrows?: IFieldArrow[]; note?: string; }

/* Horizontal field strip: own goal (left) to opponent goal (right).
   markers: [{yard: 0-100 from own goal, label, sub, down?}]  arrows: [{from,to,label}] */
function fieldStrip(opts: IFieldStripOpts): string {
  const { markers = [], arrows = [], note = "" } = opts;
  const x0 = 24, x1 = 316, y = 78, fy0 = 40, fy1 = 104;
  const xAt = (yd: number) => x0 + (yd / 100) * (x1 - x0);
  let s = `<rect x="${x0}" y="${fy0}" width="${x1 - x0}" height="${fy1 - fy0}" class="dgm-turf"/>`;
  // end zones
  s += `<rect x="${x0 - 14}" y="${fy0}" width="14" height="${fy1 - fy0}" class="dgm-ez"/>`;
  s += `<rect x="${x1}" y="${fy0}" width="14" height="${fy1 - fy0}" class="dgm-ez"/>`;
  // yard lines every 10
  for (let yd = 0; yd <= 100; yd += 10) {
    const x = xAt(yd);
    s += `<line x1="${x}" y1="${fy0}" x2="${x}" y2="${fy1}" class="dgm-line${yd === 50 ? " dgm-line-mid" : ""}"/>`;
    const num = yd <= 50 ? yd : 100 - yd;
    if (yd % 20 === 10 || yd === 50) {
      s += `<text x="${x}" y="${fy1 - 6}" class="dgm-yardnum" text-anchor="middle">${num}</text>`;
    }
  }
  s += `<text x="${x0 - 7}" y="${(fy0 + fy1) / 2}" class="dgm-ezlabel" text-anchor="middle" transform="rotate(-90 ${x0 - 7} ${(fy0 + fy1) / 2})">OWN</text>`;
  s += `<text x="${x1 + 7}" y="${(fy0 + fy1) / 2}" class="dgm-ezlabel" text-anchor="middle" transform="rotate(90 ${x1 + 7} ${(fy0 + fy1) / 2})">OPP</text>`;
  // arrows
  arrows.forEach(a => {
    const xa = xAt(a.from), xb = xAt(a.to), ay = 52;
    const dir = xb > xa ? 1 : -1;
    s += `<line x1="${xa}" y1="${ay}" x2="${xb - dir * 6}" y2="${ay}" class="dgm-arrow"/>`;
    s += `<path d="M ${xb} ${ay} l ${-dir * 8} -4 v 8 z" class="dgm-arrowhead"/>`;
    if (a.label) s += `<text x="${(xa + xb) / 2}" y="${ay - 6}" class="dgm-small" text-anchor="middle">${a.label}</text>`;
  });
  // markers
  markers.forEach(m => {
    const x = xAt(m.yard);
    s += `<circle cx="${x}" cy="${y}" r="7" class="dgm-ball"/>`;
    s += `<text x="${x}" y="${28}" class="dgm-label" text-anchor="middle">${m.label}</text>`;
    if (m.sub) s += `<text x="${x}" y="${fy1 + 16}" class="dgm-small" text-anchor="middle">${m.sub}</text>`;
  });
  if (note) s += `<text x="${W / 2}" y="${fy1 + 34}" class="dgm-note" text-anchor="middle">${note}</text>`;
  return svgWrap(s, note ? 150 : 132);
}

interface IFlowStep { t: string; sub?: string; }

/* Step flow: boxes with arrows, wrapping onto rows. steps: [{t, sub}] */
function flow(steps: IFlowStep[], note?: string): string {
  const bw = 96, bh = 40, gap = 18, perRow = 3;
  const rows = Math.ceil(steps.length / perRow);
  const h = rows * (bh + 26) + 16 + (note ? 20 : 0);
  let s = "";
  steps.forEach((st, i) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    const x = 16 + c * (bw + gap), yy = 8 + r * (bh + 26);
    s += `<rect x="${x}" y="${yy}" width="${bw}" height="${bh}" rx="4" class="dgm-box"/>`;
    s += `<text x="${x + bw / 2}" y="${yy + (st.sub ? 17 : 25)}" class="dgm-boxtext" text-anchor="middle">${st.t}</text>`;
    if (st.sub) s += `<text x="${x + bw / 2}" y="${yy + 31}" class="dgm-boxsub" text-anchor="middle">${st.sub}</text>`;
    if (i < steps.length - 1 && c < perRow - 1) {
      s += `<path d="M ${x + bw + 3} ${yy + bh / 2} h ${gap - 12} l -5 -4 m 5 4 l -5 4" class="dgm-flowarrow"/>`;
    } else if (i < steps.length - 1) {
      s += `<path d="M ${x + bw / 2} ${yy + bh + 3} v 14 l -4 -5 m 4 5 l 4 -5" class="dgm-flowarrow"/>`;
    }
  });
  if (note) s += `<text x="${W / 2}" y="${h - 6}" class="dgm-note" text-anchor="middle">${note}</text>`;
  return svgWrap(s, h);
}

interface ITimelinePoint { at: string; label: string; }

/* Timeline: [{at, label, sub}] left→right */
function timeline(points: ITimelinePoint[], note?: string): string {
  const x0 = 30, x1 = 310, y = 44;
  let s = `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" class="dgm-arrow"/>`;
  s += `<path d="M ${x1 + 4} ${y} l -8 -4 v 8 z" class="dgm-arrowhead"/>`;
  const n = points.length;
  points.forEach((p, i) => {
    const x = x0 + (i / (n - 1)) * (x1 - x0 - 14);
    s += `<line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}" class="dgm-line-mid"/>`;
    s += `<text x="${x}" y="${y - 14}" class="dgm-label" text-anchor="middle">${p.at}</text>`;
    const rows = p.label.split("|");
    rows.forEach((row, ri) => {
      s += `<text x="${x}" y="${y + 22 + ri * 12}" class="dgm-small" text-anchor="middle">${row}</text>`;
    });
  });
  if (note) s += `<text x="${W / 2}" y="96" class="dgm-note" text-anchor="middle">${note}</text>`;
  return svgWrap(s, note ? 104 : 88);
}

const D: Record<string, string> = {};

// No kickoffs — start at 35; safety → 50
D["II-8"] = fieldStrip({
  markers: [
    { yard: 35, label: "AFTER ANY SCORE", sub: "own 35 · 1st &amp; 10" },
    { yard: 50, label: "AFTER SAFETY", sub: "the 50" },
  ],
  note: "No kickoffs at any level — ball is placed, never kicked.",
});

// Onside alternative
D["II-8-b"] = fieldStrip({
  markers: [{ yard: 25, label: "ONSIDE OPTION", sub: "own 25 · 4th &amp; 10" }],
  arrows: [{ from: 25, to: 35, label: "need 10" }],
  note: "TD scored, under 4:00 left, still trailing. Declared = locked in.",
});

// Score management possession map
D["II-10-b"] = fieldStrip({
  markers: [
    { yard: 50, label: "TRAILING TEAM", sub: "starts at the 50" },
    { yard: 20, label: "LEADING TEAM", sub: "back to own 20" },
  ],
  note: "Gap is 25+ points. Leading team possession outside its 20 moves back.",
});

// Flip at the 20
D["II-10-b2d"] = fieldStrip({
  markers: [{ yard: 80, label: "NEXT SNAP AT/INSIDE THEIR 20", sub: "up 25+" }],
  arrows: [{ from: 80, to: 50, label: "ball flips to trailing team" }],
  note: "Possession immediately goes to the trailing team at the 50.",
});

// 8-player: formation
D["II-6-a"] = (function () {
  const y = 46, cx = W / 2;
  let s = `<line x1="30" y1="${y}" x2="310" y2="${y}" class="dgm-line-mid"/>`;
  s += `<text x="30" y="${y - 8}" class="dgm-small">LOS</text>`;
  const line = [-70, -35, 0, 35, 70];
  line.forEach((dx, i) => {
    const elig = i === 0 || i === line.length - 1;
    if (elig) s += `<circle cx="${cx + dx}" cy="${y + 14}" r="8" class="dgm-o"/>`;
    else s += `<rect x="${cx + dx - 7}" y="${y + 7}" width="14" height="14" class="dgm-x"/>`;
  });
  s += `<circle cx="${cx}" cy="${y + 44}" r="8" class="dgm-o"/>`;
  s += `<circle cx="${cx - 45}" cy="${y + 44}" r="8" class="dgm-o"/>`;
  s += `<circle cx="${cx + 45}" cy="${y + 44}" r="8" class="dgm-o"/>`;
  s += `<text x="${cx}" y="${y + 72}" class="dgm-small" text-anchor="middle">5 on the line: 3 ineligible (■) + 2 eligible ends (●) · 3 in the backfield</text>`;
  return svgWrap(s, 128);
})();

// 8-player: field
D["II-6-b"] = (function () {
  const x0 = 40, x1 = 300, y0 = 20, y1 = 96;
  let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" class="dgm-turf"/>`;
  for (let i = 1; i < 10; i++) {
    const x = x0 + (i / 10) * (x1 - x0);
    s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" class="dgm-line"/>`;
  }
  s += `<line x1="${x0}" y1="${(y0 + y1) / 2}" x2="${x1}" y2="${(y0 + y1) / 2}" class="dgm-dash"/>`;
  s += `<circle cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" r="6" class="dgm-ball"/>`;
  s += `<text x="${(x0 + x1) / 2}" y="${(y0 + y1) / 2 - 12}" class="dgm-small" text-anchor="middle">ball always spots on the home hash</text>`;
  s += `<text x="${(x0 + x1) / 2}" y="${y1 + 16}" class="dgm-label" text-anchor="middle">100 YD LONG</text>`;
  s += `<text x="${x0 - 12}" y="${(y0 + y1) / 2}" class="dgm-label" text-anchor="middle" transform="rotate(-90 ${x0 - 12} ${(y0 + y1) / 2})">35 YD WIDE</text>`;
  s += `<text x="${(x0 + x1) / 2}" y="${y0 - 6}" class="dgm-small" text-anchor="middle">home sideline</text>`;
  s += `<text x="${(x0 + x1) / 2}" y="${y1 + 32}" class="dgm-note" text-anchor="middle">Far hashmarks act as the visitor sideline.</text>`;
  return svgWrap(s, 140);
})();

// 8-player: free punt
D["II-6-g"] = (function () {
  const y = 56;
  let s = `<rect x="20" y="${y - 26}" width="300" height="52" class="dgm-band"/>`;
  s += `<line x1="20" y1="${y}" x2="320" y2="${y}" class="dgm-line-mid"/>`;
  s += `<text x="24" y="${y - 32}" class="dgm-small">3 yd</text>`;
  s += `<text x="24" y="${y + 42}" class="dgm-small">3 yd</text>`;
  for (let i = 0; i < 8; i++) {
    const x = 50 + i * 34;
    s += `<rect x="${x - 6}" y="${y - 20}" width="12" height="12" class="dgm-x"/>`;
    if (i !== 3) s += `<circle cx="${x}" cy="${y + 14}" r="6" class="dgm-o"/>`;
  }
  s += `<circle cx="${50 + 3 * 34}" cy="${y + 44}" r="7" class="dgm-ball"/>`;
  s += `<text x="${50 + 3 * 34 + 14}" y="${y + 48}" class="dgm-small">punter</text>`;
  s += `<text x="${W / 2}" y="${y + 68}" class="dgm-note" text-anchor="middle">8 within 3 yds each side, except the punter · declared · clock stops · no return.</text>`;
  return svgWrap(s, 134);
})();

// PAT values (all levels)
D["II-9"] = (function () {
  let s = `<rect x="20" y="10" width="140" height="74" rx="4" class="dgm-box"/>`;
  // goal post
  s += `<path d="M 55 66 v -28 m -14 0 h 28 m -28 0 v -18 m 28 18 v -18" class="dgm-post"/>`;
  s += `<text x="110" y="38" class="dgm-big" text-anchor="middle">2</text>`;
  s += `<text x="110" y="56" class="dgm-small" text-anchor="middle">POINTS</text>`;
  s += `<text x="90" y="100" class="dgm-label" text-anchor="middle">KICK</text>`;
  s += `<rect x="180" y="10" width="140" height="74" rx="4" class="dgm-box"/>`;
  s += `<path d="M 200 60 q 20 -24 40 -8" class="dgm-arrow" fill="none"/>`;
  s += `<path d="M 242 54 l -9 -1 4 8 z" class="dgm-arrowhead"/>`;
  s += `<text x="285" y="38" class="dgm-big" text-anchor="middle">1</text>`;
  s += `<text x="285" y="56" class="dgm-small" text-anchor="middle">POINT</text>`;
  s += `<text x="250" y="100" class="dgm-label" text-anchor="middle">RUN / PASS</text>`;
  s += `<text x="${W / 2}" y="120" class="dgm-note" text-anchor="middle">Kick = 2 · Run or pass = 1 — same at every level.</text>`;
  return svgWrap(s, 128);
})();
D["II-6-d"] = D["II-9"];

// Substitution cycle
D["II-7-a"] = flow([
  { t: "POSSESSION", sub: "changes" },
  { t: "EMPTY THE", sub: "BENCH" },
  { t: "4 PLAYS", sub: "locked in" },
  { t: "FREE SUBS", sub: "after play 4" },
  { t: "SCORE?", sub: "free sub for try" },
  { t: "RESTARTS", sub: "after score or turnover" },
], "Injured player: free sub anytime; he sits at least 1 play.");
D["II-7-a3"] = D["II-7-a"];

// Weigh-in timeline
D["II-2-h"] = timeline([
  { at: "-60:00", label: "teams|arrive" },
  { at: "-55:00", label: "visitors|weigh" },
  { at: "-50:00", label: "home weighs|(latest start)" },
  { at: "-15:00", label: "last regular|weigh-in" },
  { at: "HALF", label: "late arrivals|final window" },
], "Arrive later than -15:00 → no 1st half; weigh by halftime to play 2nd.");
D["II-2-i"] = D["II-2-h"];
D["II-2-a"] = D["II-2-h"];

// OT (playoff)
D["II-11-c"] = flow([
  { t: "COIN TOSS", sub: "possession pick" },
  { t: "1st &amp; 10", sub: "from the 10" },
  { t: "STILL TIED?", sub: "" },
  { t: "1st &amp; GOAL", sub: "from the 5" },
  { t: "REPEAT @ 5", sub: "until decided" },
  { t: "CHAMPIONSHIP", sub: "2 sessions max" },
], "PAT tried after every TD · substitution rule stays in effect.");

// Seeding shootout
D["II-11-b"] = flow([
  { t: "COIN TOSS", sub: "farthest = visitor" },
  { t: "1st &amp; 10", sub: "from the 20" },
  { t: "STILL TIED?", sub: "" },
  { t: "1st &amp; 10", sub: "from the 10" },
  { t: "REPEAT @ 10", sub: "until decided" },
  { t: "1 TIMEOUT", sub: "per session" },
], "For seeding ties that require a shootout — e.g., the last playoff spot.");

// Playoff structure — Gold bracket per Appendix C (one-division format):
// QF: A1 v B4, B2 v A3, B1 v A4, A2 v B3 → two SFs → Championship.
D["II-14-d"] = (function () {
  function seed(x: number, y: number, t: string, w?: number): string {
    w = w || 58;
    return `<rect x="${x}" y="${y}" width="${w}" height="16" rx="3" class="dgm-box"/>` +
           `<text x="${x + w / 2}" y="${y + 12}" class="dgm-boxsub" text-anchor="middle">${t}</text>`;
  }
  function joiner(x: number, y1: number, y2: number): string {
    const ym = (y1 + y2) / 2;
    return `<path d="M ${x} ${y1} h 8 V ${ym} h 8 M ${x} ${y2} h 8 V ${ym}" class="dgm-flowarrow" fill="none"/>`;
  }
  const P: [string, string][] = [["A 1st", "B 4th"], ["B 2nd", "A 3rd"], ["B 1st", "A 4th"], ["A 2nd", "B 3rd"]];
  let s = `<text x="20" y="14" class="dgm-label">GOLD — TOP 4 PER CONF (ONE-DIVISION FORMAT)</text>`;
  P.forEach((pair, i) => {
    const y1 = 24 + i * 44, y2 = y1 + 20;
    s += seed(20, y1, pair[0]) + seed(20, y2, pair[1]) + joiner(78, y1 + 8, y2 + 8);
  });
  // SF joins QF pairs 1+2 and 3+4
  s += seed(102, 45, "SEMI", 50) + seed(102, 133, "SEMI", 50);
  s += joiner(152, 53, 141);
  s += seed(176, 89, "CHAMPION", 74);
  s += `<text x="20" y="222" class="dgm-label">SILVER — NEXT 2 PER CONFERENCE</text>`;
  s += seed(20, 230, "SF · WK 9", 66) + seed(118, 230, "FINAL · WK 10", 84);
  s += `<path d="M 86 238 h 32" class="dgm-flowarrow"/>`;
  s += `<text x="20" y="266" class="dgm-note">Everyone else: consolation matchup in week 9 vs a similar record.</text>`;
  s += `<text x="20" y="280" class="dgm-note">Two-Division levels (&gt;20 teams): Division winners seed #1–2.</text>`;
  return svgWrap(s, 290);
})();

// Contact progression
D["I-9-fgh"] = flow([
  { t: "2 PRACTICES", sub: "no collision" },
  { t: "3 PRACTICES", sub: "full contact" },
  { t: "GAME", sub: "eligible" },
], "In equipment throughout. Meetings & film count as practice.");

// Quarter lengths (shared bars() so the value prints inside the bar —
// a bare chalk rectangle with its number floating outside reads as an
// empty disabled form field, not a data bar)
D["II-5-d"] = bars([
  { label: "ROOKIE", val: 8 },
  { label: "CUB", val: 8 },
  { label: "SOPH", val: 10 },
  { label: "JV", val: 10 },
  { label: "VARSITY", val: 10 },
], 10, "Per quarter · NFHS timing rules otherwise.", " min");

interface ICaseRow { ifT: string; ifSub?: string; thenT: string; thenSub?: string; }

/* Condition → consequence rows (independent cases, not a sequence). */
function cases(rows: ICaseRow[], note?: string): string {
  const bw = 128, bh = 34, y0 = 10, gap = 12;
  let s = "";
  rows.forEach((r, i) => {
    const y = y0 + i * (bh + gap);
    s += `<rect x="16" y="${y}" width="${bw}" height="${bh}" rx="4" class="dgm-box"/>`;
    s += `<text x="${16 + bw / 2}" y="${y + 14}" class="dgm-boxtext" text-anchor="middle">${r.ifT}</text>`;
    s += `<text x="${16 + bw / 2}" y="${y + 27}" class="dgm-boxsub" text-anchor="middle">${r.ifSub || ""}</text>`;
    s += `<path d="M ${16 + bw + 6} ${y + bh / 2} h 26 l -6 -4 m 6 4 l -6 4" class="dgm-flowarrow"/>`;
    s += `<rect x="${16 + bw + 40}" y="${y}" width="${bw}" height="${bh}" rx="4" class="dgm-box"/>`;
    s += `<text x="${16 + bw + 40 + bw / 2}" y="${y + 14}" class="dgm-boxtext" text-anchor="middle">${r.thenT}</text>`;
    s += `<text x="${16 + bw + 40 + bw / 2}" y="${y + 27}" class="dgm-boxsub" text-anchor="middle">${r.thenSub || ""}</text>`;
  });
  const h = y0 + rows.length * (bh + gap) + (note ? 18 : 4);
  if (note) s += `<text x="${W / 2}" y="${h - 6}" class="dgm-note" text-anchor="middle">${note}</text>`;
  return svgWrap(s, h);
}

interface IBarRow { label: string; val?: number; min?: number; max?: number; }

/* Horizontal range/value bars with a shared scale. */
function bars(rows: IBarRow[], maxVal: number, note?: string, unit?: string): string {
  let s = "";
  rows.forEach((r, i) => {
    const y = 12 + i * 22;
    const x0 = 96, x1 = 316;
    const scale = (v: number) => x0 + (v / maxVal) * (x1 - x0);
    s += `<text x="${x0 - 8}" y="${y + 12}" class="dgm-small" text-anchor="end">${r.label}</text>`;
    if (r.min !== undefined) {
      const max = r.max!; // invariant: bars() callers always pair min with max
      s += `<rect x="${scale(r.min)}" y="${y}" width="${scale(max) - scale(r.min)}" height="15" class="dgm-bar"/>`;
      s += `<text x="${scale(r.min) - 3}" y="${y + 12}" class="dgm-small" text-anchor="end"></text>`;
      s += `<text x="${scale(r.min) + 3}" y="${y + 12}" class="dgm-barnum">${r.min}</text>`;
      s += `<text x="${scale(max) - 3}" y="${y + 12}" class="dgm-barnum" text-anchor="end">${max}</text>`;
    } else {
      const val = r.val!; // invariant: bars() callers always set val when min/max are absent
      s += `<rect x="${x0}" y="${y}" width="${scale(val) - x0}" height="15" class="dgm-bar"/>`;
      s += `<text x="${scale(val) - 5}" y="${y + 12}" class="dgm-barnum" text-anchor="end">${val}${unit || ""}</text>`;
    }
  });
  const h = 12 + rows.length * 22 + (note ? 22 : 6);
  if (note) s += `<text x="${W / 2}" y="${h - 8}" class="dgm-note" text-anchor="middle">${note}</text>`;
  return svgWrap(s, h);
}

// Ejection consequences
D["II-3-c"] = cases([
  { ifT: "EJECTED", ifSub: "player or coach", thenT: "NEXT GAME", thenSub: "automatically out" },
  { ifT: "2ND EJECTION", ifSub: "same season", thenT: "REST OF SEASON", thenSub: "suspended" },
  { ifT: "EJECTED COACH", ifSub: "before return", thenT: "GRIEVANCE CMTE", thenSub: "w/ club president" },
], "Player ejections from judgment calls may be appealed with video — see Appendix B.");

// Player ejection appeal clock (Appendix B)
D["APP-B"] = timeline([
  { at: "GAME ENDS", label: "ejection|occurred" },
  { at: "+24 HRS", label: "board member files|with video" },
  { at: "+48 HRS", label: "committee|decides" },
  { at: "FINAL", label: "no further|appeal" },
], "If the next game comes sooner, the decision comes before kickoff.");

// Practice limits
D["I-9-abc"] = bars([
  { label: "PRE-LABOR DAY", val: 5 },
  { label: "AFTER", val: 3 },
], 6, "Per week (Sun–Sat) · max 15 total before Labor Day · every session ≤ 2 hours.", "/wk");

// Roster ranges by level
D["I-7-d"] = bars([
  { label: "ROOKIE", min: 11, max: 21 },
  { label: "CUB", min: 16, max: 31 },
  { label: "SOPH", min: 17, max: 33 },
  { label: "JV", min: 18, max: 35 },
  { label: "VARSITY", min: 20, max: 35 },
], 36, "Min–max roster before a split · take players in application order up to 26 (21 at 8-player).");

// Ball specs
D["II-4-g"] = (function () {
  let s = `<rect x="16" y="8" width="150" height="80" rx="4" class="dgm-box"/>`;
  s += `<text x="91" y="26" class="dgm-boxtext" text-anchor="middle">JV &amp; VARSITY</text>`;
  s += `<text x="91" y="44" class="dgm-label" text-anchor="middle">YOUTH / INTERMEDIATE</text>`;
  s += `<text x="91" y="62" class="dgm-small" text-anchor="middle">10–11 in · 26–27 in circ.</text>`;
  s += `<text x="91" y="76" class="dgm-small" text-anchor="middle">12–14 oz</text>`;
  s += `<rect x="174" y="8" width="150" height="80" rx="4" class="dgm-box"/>`;
  s += `<text x="249" y="26" class="dgm-boxtext" text-anchor="middle">SOPH · CUB · ROOKIE</text>`;
  s += `<text x="249" y="44" class="dgm-label" text-anchor="middle">JUNIOR</text>`;
  s += `<text x="249" y="62" class="dgm-small" text-anchor="middle">9.5–10.5 in · 25–26 in circ.</text>`;
  s += `<text x="249" y="76" class="dgm-small" text-anchor="middle">11–13 oz</text>`;
  s += `<text x="${W / 2}" y="106" class="dgm-note" text-anchor="middle">Leather, composite, or rubber — officials give final approval.</text>`;
  return svgWrap(s, 114);
})();

// Standings points
D["II-14-a"] = (function () {
  const cols = [["WIN", "2"], ["TIE", "1"], ["LOSS", "0"]];
  let s = "";
  cols.forEach((c, i) => {
    const x = 26 + i * 100;
    s += `<rect x="${x}" y="10" width="88" height="62" rx="4" class="dgm-box"/>`;
    s += `<text x="${x + 44}" y="44" class="dgm-big" text-anchor="middle">${c[1]}</text>`;
    s += `<text x="${x + 44}" y="62" class="dgm-small" text-anchor="middle">POINTS</text>`;
    s += `<text x="${x + 44}" y="90" class="dgm-label" text-anchor="middle">${c[0]}</text>`;
  });
  s += `<text x="${W / 2}" y="112" class="dgm-note" text-anchor="middle">8-game season · margin of victory never affects seeding.</text>`;
  return svgWrap(s, 120);
})();

// Protest deadline
D["II-13-abc"] = timeline([
  { at: "IN GAME", label: "judgment calls:|no protest" },
  { at: "SATURDAY", label: "game|ends" },
  { at: "MON 8 AM", label: "written protest due|to the President" },
], "Rule-interpretation protests only — filed via your Club Director.");

// 32-point penalty ladder
D["II-10-c"] = cases([
  { ifT: "LEAD > 32", ifSub: "offensive score", thenT: "AUTO SUSPENDED", thenSub: "next game" },
  { ifT: "LEAD > 32", ifSub: "defensive score", thenT: "MEET GRIEVANCE", thenSub: "before next game" },
  { ifT: "WIN BY > 38", ifSub: "any situation", thenT: "AUTO SUSPENDED", thenSub: "next game" },
], "2nd violation, or team contact while suspended = rest of season, no appeal.");

// Interrupted games
D["II-12"] = flow([
  { t: "UNSAFE", sub: "lightning etc." },
  { t: "RESUME", sub: "same day if safe" },
  { t: "REPORT", sub: "by end of day" },
  { t: "TUE / WED", sub: "likely resume" },
  { t: "SAME SPOT", sub: "point of interruption" },
  { t: "OR AGREE", sub: "end with score" },
], "Lopsided score? Terminating is encouraged; the League rules if no agreement.");

// Missed weight progression
D["II-2-l"] = flow([
  { t: "MISS WEIGHT", sub: "game 1" },
  { t: "MISS AGAIN", sub: "game 2*" },
  { t: "MOVES UP", sub: "next level" },
], "*Skipping the next game counts as the 2nd miss without a satisfactory reason.");

// Officials per game
D["II-5-h"] = bars([
  { label: "ROOKIE", val: 2 },
  { label: "CUB", val: 3 },
  { label: "SOPH/JV/V", val: 4 },
], 5, "Full crew: 2 at Rookie, 3 at Cub · 3 assigned everywhere, 4th targeted for Soph/JV/V.", " officials");

// Weigh-in tolerance
D["II-2-b"] = (function () {
  let s = `<rect x="70" y="10" width="200" height="64" rx="4" class="dgm-box"/>`;
  s += `<text x="${W / 2}" y="48" class="dgm-big" text-anchor="middle">+ 0.9 LB</text>`;
  s += `<text x="${W / 2}" y="66" class="dgm-small" text-anchor="middle">MAXIMUM OVER ALLOWANCE</text>`;
  s += `<text x="${W / 2}" y="96" class="dgm-note" text-anchor="middle">More than 9/10 of a pound over the max at weigh-in = cannot play this game.</text>`;
  return svgWrap(s, 104);
})();

export const GEJFA_DIAGRAMS: TDiagramMap = D;
