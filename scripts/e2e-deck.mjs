#!/usr/bin/env node
/* Builds the "film room" deck from an e2e run: one self-contained HTML page
 * (screenshots inlined) that walks every driven frame with the coach's use
 * case, what the run actually did, and the checks it passed.
 *
 *   pnpm e2e:deck                      → reads e2e-out/frames.json, writes e2e-out/deck.html
 *   node scripts/e2e-deck.mjs --in <dir>
 *
 * The page is authored as a body fragment (title/link/style first, no html/
 * head/body wrappers) so it opens locally and also publishes as-is. */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argIn = process.argv.indexOf("--in");
const IN = resolve(argIn > -1 ? process.argv[argIn + 1] : join(ROOT, "e2e-out"));
const m = JSON.parse(readFileSync(join(IN, "frames.json"), "utf8"));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const png = (name) => "data:image/png;base64," + readFileSync(join(IN, name)).toString("base64");

/* Chapters group the run the way a game unfolds. Order carries meaning: the
   run is one continuous session, so frame numbers are real sequence. */
const CHAPTERS = [
  { id: "open",   label: "First open",         range: ["01", "04"] },
  { id: "find",   label: "Find a rule",        range: ["05", "10"] },
  { id: "score",  label: "Score check",        range: ["11", "21"] },
  { id: "tap",    label: "One tap & recents",  range: ["22", "23"] },
  { id: "links",  label: "Shared links",       range: ["24", "27"] },
  { id: "field",  label: "At the field",       range: ["28", "29"] },
];
const chapterOf = (f) => CHAPTERS.find(c => f.id.slice(0, 2) >= c.range[0] && f.id.slice(0, 2) <= c.range[1]);

const browserName = /msedge/i.test(m.browser) ? "Microsoft Edge (headless)" : /chrome/i.test(m.browser) ? "Google Chrome (headless)" : m.browser;
const when = new Date(m.startedAt);
const dateLabel = when.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
const seconds = Math.round((new Date(m.finishedAt) - when) / 1000);
const t = m.totals;
const verdict = t.failed === 0 ? "All clear" : `${t.failed} failed`;

const frameHTML = (f, i) => {
  const ch = chapterOf(f);
  const bad = f.checks.filter(c => !c.pass).length;
  const state = f.error ? "err" : bad ? "fail" : f.skipped ? "skip" : "pass";
  const stateLabel = f.error ? "Error" : bad ? `${bad} failed` : f.skipped ? "Skipped" : `${f.checks.length} verified`;
  return `
  <article class="play ${state}" id="${esc(f.id)}">
    <div class="phone-col">
      <figure class="phone">
        <img src="${png(f.png)}" alt="Screenshot: ${esc(f.title)}" width="${m.viewport.width}" height="${m.viewport.height}" loading="${i < 2 ? "eager" : "lazy"}" decoding="async">
      </figure>
      <p class="url"><span class="url-k">URL</span> <code>/${esc(f.url || "")}</code></p>
    </div>
    <div class="story">
      <p class="eyebrow"><span class="num">Play ${esc(f.id.slice(0, 2))}</span><span class="dot" aria-hidden="true"></span>${esc(ch ? ch.label : "")}<span class="state state-${state}">${stateLabel}</span></p>
      <h3>${esc(f.title)}</h3>
      <p class="usecase">${esc(f.useCase)}</p>
      <div class="cols">
        <section>
          <h4>What the run did</h4>
          <ol class="steps">${f.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
        </section>
        <section>
          <h4>Verified</h4>
          <ul class="checks">${f.checks.map(c => `<li class="${c.pass ? "ok" : "no"}"><span class="tick" aria-hidden="true">${c.pass ? "✓" : "✗"}</span><span>${esc(c.label)}${!c.pass && c.detail ? ` <em>— ${esc(c.detail)}</em>` : ""}</span></li>`).join("")}</ul>
          ${f.error ? `<p class="errline">Run error: ${esc(f.error)}</p>` : ""}
          ${f.skipped ? `<p class="note">Skipped: ${esc(f.skipped)}</p>` : ""}
        </section>
      </div>
      ${f.notes.length ? `<div class="notes"><h4>Observed</h4>${f.notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}</div>` : ""}
    </div>
  </article>`;
};

const contents = CHAPTERS.map(ch => {
  const fs = m.frames.filter(f => chapterOf(f) === ch);
  if (!fs.length) return "";
  return `<li><span class="ch">${esc(ch.label)}</span><ul>${fs.map(f => `<li><a href="#${esc(f.id)}"><span class="n">${esc(f.id.slice(0, 2))}</span>${esc(f.title)}</a></li>`).join("")}</ul></li>`;
}).join("");

const observed = m.frames.flatMap(f => f.notes.map(n => ({ id: f.id, title: f.title, n })));

const html = `<title>Spartans Rules Film Room</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Graduate&family=Barlow:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>
  :root {
    /* dark-first: the app's own world — black chrome, forest field, chalk print */
    --ink: #050705; --field: #16281c; --raised: #1f3627; --line: #2c4a34; --line-soft: #233b2a;
    --chalk: #f5f3ec; --chalk-dim: #d9dbcf; --grey: #b7c2b6; --muted: #8fa091;
    --pass: #9fd3a6; --fail: #e8865f; --skip: #d9c48a;
    --bezel: #0b0f0c; --shadow: 0 18px 40px rgba(0,0,0,.45);
    --display: "Graduate", "Rockwell", "Georgia", serif;
    --body: "Barlow", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  @media (prefers-color-scheme: light) {
    :root:not([data-theme="dark"]) {
      --ink: #16281c; --field: #f3f1ea; --raised: #fbfaf5; --line: #cfd6c9; --line-soft: #e2e6dc;
      --chalk: #14231a; --chalk-dim: #2c4033; --grey: #4f6354; --muted: #6f8274;
      --pass: #2f7d47; --fail: #b5472a; --skip: #8a6d1f;
      --bezel: #1b2a20; --shadow: 0 16px 36px rgba(22,40,28,.22);
    }
  }
  :root[data-theme="light"] {
    --ink: #16281c; --field: #f3f1ea; --raised: #fbfaf5; --line: #cfd6c9; --line-soft: #e2e6dc;
    --chalk: #14231a; --chalk-dim: #2c4033; --grey: #4f6354; --muted: #6f8274;
    --pass: #2f7d47; --fail: #b5472a; --skip: #8a6d1f;
    --bezel: #1b2a20; --shadow: 0 16px 36px rgba(22,40,28,.22);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--field); color: var(--chalk); font-family: var(--body); font-size: 16px; line-height: 1.5;
    padding-inline: clamp(16px, 4vw, 40px); padding-block: 0 72px;
    background-image: linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
    background-size: 48px 48px; background-position: -1px -1px;
  }
  a { color: inherit; }
  code { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-size: .85em; }
  h1, h2, h3, h4 { margin: 0; text-wrap: balance; }
  .wrap { max-width: 1120px; margin: 0 auto; }

  /* ---- masthead: banner bar + stripe, the app's structural motifs ---- */
  .mast { padding-block: 28px 20px; border-bottom: 3px solid var(--chalk); margin-bottom: 8px; }
  .mast .kicker { font-family: var(--display); font-size: 13px; letter-spacing: .28em; text-transform: uppercase; color: var(--grey); margin: 0 0 10px; }
  .mast h1 { font-family: var(--display); font-weight: 400; font-size: clamp(30px, 5.5vw, 52px); letter-spacing: .06em; line-height: 1.05; }
  .mast .sub { margin: 12px 0 0; max-width: 62ch; color: var(--grey); font-size: 17px; }
  .stripe { height: 6px; background: var(--grey); margin: 6px 0 22px; opacity: .55; }

  /* ---- scoreboard: the run's facts, tabular ---- */
  .board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-bottom: 36px; }
  .board div { background: var(--raised); padding: 14px 16px; }
  .board .k { font-family: var(--display); font-size: 11px; letter-spacing: .22em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px; }
  .board .v { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .board .v small { font-size: 13px; font-weight: 400; color: var(--grey); margin-left: 4px; }
  .board .verdict .v { color: var(--pass); }
  .board .verdict.bad .v { color: var(--fail); }

  /* ---- contents ---- */
  .toc { border: 1px solid var(--line); background: var(--raised); padding: 20px 22px; margin-bottom: 48px; }
  .toc h2 { font-family: var(--display); font-weight: 400; font-size: 14px; letter-spacing: .24em; text-transform: uppercase; color: var(--grey); margin-bottom: 14px; }
  .toc > ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px 32px; }
  .toc .ch { display: block; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; font-size: 13px; margin-bottom: 6px; color: var(--chalk-dim); }
  .toc ul ul { list-style: none; margin: 0; padding: 0; }
  .toc ul ul li a { display: flex; gap: 10px; text-decoration: none; padding: 3px 0; color: var(--grey); }
  .toc ul ul li a:hover, .toc ul ul li a:focus-visible { color: var(--chalk); }
  .toc .n { font-family: var(--display); font-size: 12px; color: var(--muted); min-width: 2ch; padding-top: 3px; }

  /* ---- chapters ---- */
  .chapter { display: flex; align-items: center; gap: 16px; margin: 56px 0 24px; }
  .chapter h2 { font-family: var(--display); font-weight: 400; font-size: clamp(20px, 3vw, 28px); letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
  .chapter::before, .chapter::after { content: ""; height: 2px; background: var(--line); flex: 1; }
  .chapter::before { max-width: 40px; }

  /* ---- a play: phone left, story right ---- */
  .play { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 32px; padding: 28px 0 40px; border-top: 1px solid var(--line); scroll-margin-top: 16px; }
  .play:first-of-type { border-top: 0; }
  .phone-col { position: sticky; top: 16px; align-self: start; }
  .phone { margin: 0; background: var(--bezel); border-radius: 34px; padding: 10px; box-shadow: var(--shadow); border: 1px solid var(--line); }
  .phone img { display: block; width: 100%; height: auto; border-radius: 26px; }
  .url { margin: 12px 0 0; color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
  .url-k { font-family: var(--display); font-size: 10px; letter-spacing: .2em; margin-right: 4px; }

  .eyebrow { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: 6px 0 10px; font-family: var(--display); font-size: 12px; letter-spacing: .22em; text-transform: uppercase; color: var(--grey); }
  .eyebrow .num { color: var(--chalk); }
  .eyebrow .dot { width: 5px; height: 5px; background: var(--muted); border-radius: 50%; }
  .state { margin-left: auto; font-family: var(--body); font-size: 12px; font-weight: 700; letter-spacing: .08em; padding: 3px 10px; border: 1px solid currentColor; border-radius: 999px; }
  .state-pass { color: var(--pass); } .state-fail, .state-err { color: var(--fail); } .state-skip { color: var(--skip); }
  .story h3 { font-size: clamp(22px, 2.6vw, 28px); font-weight: 700; line-height: 1.15; letter-spacing: -.01em; }
  .usecase { font-size: 18px; line-height: 1.5; max-width: 62ch; margin: 12px 0 22px; color: var(--chalk-dim); }
  .usecase::first-letter { font-family: var(--display); font-size: 1.35em; }
  .cols { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 24px 32px; }
  .story h4 { font-family: var(--display); font-weight: 400; font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 6px; margin-bottom: 10px; }
  .steps { margin: 0; padding-left: 20px; color: var(--grey); font-size: 15px; }
  .steps li { padding: 3px 0; padding-left: 4px; }
  .steps li::marker { font-family: var(--display); font-size: 12px; color: var(--muted); }
  .checks { list-style: none; margin: 0; padding: 0; font-size: 15px; }
  .checks li { display: flex; gap: 10px; padding: 3px 0; }
  .checks .tick { font-weight: 700; min-width: 14px; color: var(--pass); }
  .checks .no .tick { color: var(--fail); }
  .checks em { color: var(--fail); font-style: normal; }
  .errline { color: var(--fail); font-weight: 600; }
  .notes { margin-top: 20px; border-left: 3px solid var(--skip); padding: 4px 0 4px 14px; }
  .notes h4 { border: 0; margin-bottom: 4px; padding: 0; color: var(--skip); }
  .note { margin: 4px 0; color: var(--grey); font-size: 15px; }

  /* ---- observations ---- */
  .obs { border: 1px solid var(--line); background: var(--raised); padding: 20px 22px; margin-top: 56px; }
  .obs h2 { font-family: var(--display); font-weight: 400; font-size: 14px; letter-spacing: .24em; text-transform: uppercase; color: var(--grey); margin-bottom: 10px; }
  .obs p { margin: 8px 0; max-width: 72ch; }
  .obs .ref { font-family: var(--display); font-size: 11px; letter-spacing: .18em; color: var(--muted); margin-right: 8px; }
  .foot { margin-top: 40px; color: var(--muted); font-size: 13px; max-width: 72ch; }

  @media (max-width: 560px) { .board { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 760px) {
    .play { grid-template-columns: 1fr; gap: 20px; }
    .phone-col { position: static; max-width: 300px; }
    .cols { grid-template-columns: 1fr; }
    .state { margin-left: 0; }
  }
  :focus-visible { outline: 2px solid var(--chalk); outline-offset: 2px; }
  @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
</style>

<div class="wrap">
  <header class="mast">
    <p class="kicker">Skyline Spartans · GEJFA Rules 2025 · ${esc(m.version)}</p>
    <h1>Film Room</h1>
    <p class="sub">One continuous session in a real headless browser at phone size. Every frame below was reached by tapping, typing and reloading the live app; each carries the sideline use case it serves and the checks the run made against the DOM.</p>
  </header>
  <div class="stripe" role="presentation"></div>

  <dl class="board" aria-label="Run summary">
    <div class="verdict ${t.failed ? "bad" : ""}"><dt class="k">Verdict</dt><dd class="v">${esc(verdict)}</dd></div>
    <div><dt class="k">Frames</dt><dd class="v">${t.frames}</dd></div>
    <div><dt class="k">Checks</dt><dd class="v">${t.passed}<small>/ ${t.checks} passed</small></dd></div>
    <div><dt class="k">Failed</dt><dd class="v">${t.failed}</dd></div>
    <div><dt class="k">Skipped</dt><dd class="v">${t.skipped}</dd></div>
    <div><dt class="k">Run time</dt><dd class="v">${seconds}<small>s</small></dd></div>
    <div><dt class="k">Browser</dt><dd class="v" style="font-size:16px">${esc(browserName)}</dd></div>
    <div><dt class="k">Viewport</dt><dd class="v">${m.viewport.width}×${m.viewport.height}<small>@${m.scale}x</small></dd></div>
    <div><dt class="k">Date</dt><dd class="v" style="font-size:16px">${esc(dateLabel)}</dd></div>
  </dl>

  <nav class="toc" aria-label="Contents">
    <h2>Plays</h2>
    <ul>${contents}</ul>
  </nav>

  ${CHAPTERS.map(ch => {
    const fs = m.frames.filter(f => chapterOf(f) === ch);
    if (!fs.length) return "";
    return `<section aria-labelledby="ch-${ch.id}"><div class="chapter"><h2 id="ch-${ch.id}">${esc(ch.label)}</h2></div>${fs.map((f) => frameHTML(f, m.frames.indexOf(f))).join("")}</section>`;
  }).join("")}

  <section class="obs" aria-labelledby="obs-h">
    <h2 id="obs-h">Observed along the way</h2>
    ${observed.length ? observed.map(o => `<p><span class="ref">Play ${esc(o.id.slice(0, 2))}</span>${esc(o.n)}</p>`).join("") : "<p>Nothing beyond the checks above.</p>"}
    <p>The Chrome-native install dialog was suppressed for the run (it has no headless UI and swallows every later tap), so the app's own step sheet — the path iOS Safari and non-Chromium browsers take — is what Play 04 exercises. The OS share sheet was replaced by a recorder so Plays 09 and 18 could verify the exact link handed to it.</p>
  </section>

  <p class="foot">Generated by <code>scripts/e2e-frames.mjs</code> (drive + assert + capture) and <code>scripts/e2e-deck.mjs</code> (this page). Rule content in the frames is the app's own; nothing here restates a rule. Started ${esc(m.startedAt)}, finished ${esc(m.finishedAt)}.</p>
</div>
`;

writeFileSync(join(IN, "deck.html"), html);
console.log(`deck: ${join(IN, "deck.html")}  (${(html.length / 1024 / 1024).toFixed(1)} MB, ${m.frames.length} frames)`);
