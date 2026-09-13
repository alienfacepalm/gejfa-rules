#!/usr/bin/env node
/* Empirical end-to-end run — drives the real app in a real headless Chromium
 * exactly as a coach would (taps, typing, keyboard, reloads, going offline),
 * asserts the DOM at every frame, and saves one PNG per frame plus a
 * frames.json manifest that scripts/e2e-deck.mjs turns into an HTML deck.
 *
 *   pnpm e2e                      → writes to e2e-out/ (git-ignored)
 *   node scripts/e2e-frames.mjs --out <dir>
 *
 * Same zero-dependency DevTools Protocol approach as readme-screenshots.mjs:
 * Node 22+ (built-in WebSocket) and an installed Chrome/Edge (BROWSER_BIN to
 * override). Every interaction is a real Input.dispatchMouseEvent /
 * Input.insertText / Input.dispatchKeyEvent, not a synthetic DOM event, so the
 * run exercises the same code path a phone does. Exit code is non-zero when
 * any check fails. */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const argOut = process.argv.indexOf("--out");
const OUT = resolve(argOut > -1 ? process.argv[argOut + 1] : join(ROOT, "e2e-out"));
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2;
const EXPECTED_VERSION = "v" + readFileSync(join(DOCS, "version.js"), "utf8").match(/GEJFA_VERSION = (\d+)/)[1];

const CANDIDATES = [
  process.env.BROWSER_BIN,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
].filter(Boolean);
function findBrowser() {
  const hit = CANDIDATES.find(p => existsSync(p));
  if (!hit) { console.error("No Chromium-based browser found. Set BROWSER_BIN=<path>."); process.exit(1); }
  return hit;
}

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf",
};
function serve() {
  return new Promise((ok) => {
    const srv = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = join(DOCS, path === "/" ? "index.html" : path);
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
      if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(readFileSync(file));
    });
    srv.listen(0, "127.0.0.1", () => ok(srv));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---- DevTools client ------------------------------------------------------ */
async function launch(browser) {
  const profile = mkdtempSync(join(tmpdir(), "gejfa-e2e-"));
  const child = spawn(browser, [
    "--headless=new", "--disable-gpu", "--disable-extensions", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  const portFile = join(profile, "DevToolsActivePort");
  const started = Date.now();
  while (!existsSync(portFile) || readFileSync(portFile, "utf8").split("\n").length < 2) {
    if (Date.now() - started > 30000) { child.kill(); throw new Error("browser did not expose DevTools within 30s"); }
    if (child.exitCode !== null) throw new Error(`browser exited early (code ${child.exitCode})`);
    await sleep(100);
  }
  const [port, path] = readFileSync(portFile, "utf8").trim().split("\n");
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no(new Error("DevTools websocket failed")); });
  return { child, profile, ws };
}
function makeCdp(ws) {
  let seq = 0; const pending = new Map(); const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { ok, no } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? no(new Error(`${msg.error.message} (${msg.error.data ?? ""})`)) : ok(msg.result);
    } else if (msg.method) for (const fn of listeners) fn(msg);
  };
  return {
    send(method, params = {}, sessionId) {
      const id = ++seq; ws.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((ok, no) => pending.set(id, { ok, no }));
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/* ---- Page driver: real input events, DOM queries, screenshots ----------- */
class Page {
  constructor(cdp, sessionId, base) { this.cdp = cdp; this.sid = sessionId; this.base = base; this.consoleErrors = []; this.occlusions = []; }
  async init() {
    await this.cdp.send("Page.enable", {}, this.sid);
    await this.cdp.send("Runtime.enable", {}, this.sid);
    await this.cdp.send("Network.enable", {}, this.sid);
    await this.cdp.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: SCALE, mobile: true }, this.sid);
    await this.cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true }, this.sid);
    // Chrome's native install dialog (beforeinstallprompt → prompt()) has no
    // headless UI and swallows every later input event. Swallow the event
    // before app.js sees it so the run exercises the app's own step sheet —
    // the same path iOS Safari and every non-Chromium browser take.
    await this.cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true);"
        // Stand-in for the OS share sheet (no UI headless): record what the app hands it.
        + "window.__e2eShares = []; navigator.share = (d) => { window.__e2eShares.push(d); return Promise.resolve(); };",
    }, this.sid);
    this.cdp.on((msg) => {
      if (msg.sessionId !== this.sid) return;
      if (msg.method === "Runtime.exceptionThrown") this.consoleErrors.push(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || "exception");
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") this.consoleErrors.push(msg.params.args.map(a => a.value ?? a.description).join(" "));
    });
  }
  async eval(expression) {
    const r = await this.cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, this.sid);
    if (r.exceptionDetails) throw new Error("eval failed: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + "\n  in: " + expression);
    return r.result.value;
  }
  async goto(query) {
    const url = this.base + query;
    const loaded = new Promise((ok) => { const off = this.cdp.on((m) => { if (m.sessionId === this.sid && m.method === "Page.loadEventFired") { off(); ok(); } }); });
    await this.cdp.send("Page.navigate", { url }, this.sid);
    await Promise.race([loaded, sleep(20000).then(() => { throw new Error("page load timed out"); })]);
    await this.eval("document.fonts.ready.then(() => true)");
    await sleep(150);
  }
  async waitFor(expression, timeoutMs = 3000, label) {
    const t0 = Date.now();
    for (;;) {
      const v = await this.eval(expression);
      if (v) return v;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting for ${label || expression}`);
      await sleep(60);
    }
  }
  /* Real tap: scroll the element into view, then press+release at its centre. */
  async tap(selector, { text } = {}) {
    const rect = await this.eval(`(() => {
      const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
      const el = ${text ? `els.find(e => e.textContent.trim().startsWith(${JSON.stringify(text)}))` : "els[0]"};
      if (!el) return null;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    })()`);
    if (!rect) throw new Error(`tap: no element for ${selector}${text ? ` "${text}"` : ""}`);
    if (rect.w < 1 || rect.h < 1) throw new Error(`tap: ${selector} has no box`);
    // A real finger lands on whatever is on top. If something else covers the
    // target (e.g. an auto-dismissing toast), wait for it to clear like a
    // person would, then fail loudly naming the occluder if it never does.
    const occluder = `(() => {
      const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
      const el = ${text ? `els.find(e => e.textContent.trim().startsWith(${JSON.stringify(text)}))` : "els[0]"};
      const hit = document.elementFromPoint(${rect.x}, ${rect.y});
      if (!hit || !el) return "nothing";
      if (el === hit || el.contains(hit)) return "";
      return hit.tagName.toLowerCase() + (hit.className ? "." + String(hit.className).trim().split(" ").join(".") : "");
    })()`;
    let cover = await this.eval(occluder);
    if (cover) {
      this.occlusions.push({ target: selector + (text ? ` "${text}"` : ""), by: cover });
      const t0 = Date.now();
      while (cover && Date.now() - t0 < 4500) { await sleep(100); cover = await this.eval(occluder); }
      if (cover) throw new Error(`tap: ${selector} is covered by <${cover}>`);
    }
    await sleep(40);
    const base = { x: rect.x, y: rect.y, button: "left", clickCount: 1 };
    await this.cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...base, button: "none" }, this.sid);
    await this.cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", ...base }, this.sid);
    await this.cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...base }, this.sid);
    await sleep(120);
  }
  async type(selector, text) {
    const ok = await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); return document.activeElement === el; })()`);
    if (!ok) throw new Error(`type: could not focus ${selector}`);
    await this.cdp.send("Input.insertText", { text }, this.sid);
    await sleep(150); // > the app's 50 ms render debounce
  }
  async key(key, code, keyCode) {
    await this.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode }, this.sid);
    await this.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode }, this.sid);
    await sleep(80);
  }
  async scrollTo(selector) {
    await this.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) el.scrollIntoView({ block: "start", behavior: "instant" }); return true; })()`);
    await sleep(80);
  }
  async screenshot(file) {
    const { data } = await this.cdp.send("Page.captureScreenshot", { format: "png" }, this.sid);
    writeFileSync(file, Buffer.from(data, "base64"));
  }
  async setOffline(offline) {
    await this.cdp.send("Network.emulateNetworkConditions", { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, this.sid);
  }
  url() { return this.eval("location.search"); }
  text(sel) { return this.eval(`(document.querySelector(${JSON.stringify(sel)})||{textContent:null}).textContent`).then(t => t == null ? null : t.replace(/\s+/g, " ").trim()); }
  count(sel) { return this.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`); }
  exists(sel) { return this.eval(`!!document.querySelector(${JSON.stringify(sel)})`); }
  visible(sel) { return this.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el || el.hidden) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`); }
}

/* ---- Frame recorder ------------------------------------------------------- */
const frames = [];
let failures = 0;
async function frame(id, title, useCase, run) {
  const rec = { id, title, useCase, steps: [], checks: [], notes: [], url: null, png: `${id}.png`, skipped: null, error: null };
  page.occlusions = [];
  const t = {
    step: (s) => rec.steps.push(s),
    check: (label, pass, detail) => {
      rec.checks.push({ label, pass: !!pass, detail: detail == null ? undefined : String(detail) });
      if (!pass) failures++;
    },
    skip: (why) => { rec.skipped = why; },
  };
  try {
    await run(t);
    rec.url = await page.url();
    await page.screenshot(join(OUT, rec.png));
  } catch (err) {
    rec.error = err.message; failures++;
    try { rec.url = await page.url(); await page.screenshot(join(OUT, rec.png)); } catch {}
  }
  for (const o of page.occlusions) rec.notes.push(`Tap on ${o.target} was briefly covered by <${o.by}> — waited for it to clear.`);
  const bad = rec.checks.filter(c => !c.pass).length;
  const mark = rec.error ? "ERR " : bad ? "FAIL" : rec.skipped ? "skip" : "ok  ";
  console.log(`${mark} ${id}  ${title}${rec.error ? "  ← " + rec.error : ""}${bad ? `  (${bad} check(s) failed)` : ""}`);
  for (const n of rec.notes) console.log(`       note: ${n}`);
  for (const c of rec.checks) if (!c.pass) console.log(`       ✗ ${c.label}${c.detail ? "  → " + c.detail : ""}`);
  frames.push(rec);
}
const includes = (hay, needle) => (hay || "").toLowerCase().includes(needle.toLowerCase());

/* ---- The run --------------------------------------------------------------- */
const browser = findBrowser();
mkdirSync(OUT, { recursive: true });
const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}`;
const { child, profile, ws } = await launch(browser);
const cdp = makeCdp(ws);
const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
const page = new Page(cdp, sessionId, base);
await page.init();
const startedAt = new Date().toISOString();

try {
  // 1 ─ first visit
  await frame("01-first-visit", "First visit — install banner",
    "A coach opens the link a fellow coach texted them. On the very first visit the app offers to live on the phone's home screen so it works with no signal at the field.",
    async (t) => {
      t.step("Open the app at / with a fresh browser profile (no localStorage, no service worker)");
      await page.goto("/");
      t.step("Wait for the one-time install banner (appears 1.5 s after load)");
      await page.waitFor("!!document.querySelector('.install-banner')", 4000, "install banner");
      t.check("Install banner is shown on a first visit", await page.visible(".install-banner"));
      t.check("Banner offers 'Add to phone' and 'Later'", await page.exists(".install-yes") && await page.exists(".install-later"));
      t.check("Hero lockup renders (arched SKYLINE + SPARTANS)", includes(await page.text(".hero"), "SPARTANS"));
      t.check(`Footer shows the build version ${EXPECTED_VERSION}`, (await page.text("#appVersion")) === EXPECTED_VERSION, await page.text("#appVersion"));
      t.check("Game Time grid has 9 one-tap tiles", (await page.count(".quick-grid .quick")) === 9, await page.count(".quick-grid .quick"));
    });

  // 2 ─ offline saved
  await frame("02-saved-offline", "Rulebook saved for offline use",
    "Still on the first visit: once the service worker has precached every rule, font, icon and the 480 KB PDF, the app says so. From this moment the whole rulebook works with the phone in airplane mode.",
    async (t) => {
      t.step("Wait for the service worker to reach 'ready' (all assets precached)");
      const ready = await page.eval("navigator.serviceWorker.ready.then(r => !!r.active)").catch(() => false);
      t.check("Service worker registered and active", ready);
      t.step("Look for the status toast 'Rulebook saved for offline use ✓'");
      const toast = await page.waitFor("(() => { const t = document.querySelector('.toast-info'); return t ? t.textContent : ''; })()", 6000, "offline toast").catch(() => "");
      t.check("Status toast confirms the offline save", includes(toast, "saved for offline"), toast || "(no toast observed)");
      // Regression: the status toast must never sit on, or intercept taps for,
      // the sticky search row's buttons (it once did at phone width, where the
      // Topic/home row wraps beneath the input).
      t.step("Scroll so the search row is stuck at the top, then measure the toast against it");
      const geo = await page.eval(`(() => {
        const toast = document.querySelector('.toast-info'); if (!toast) return null;
        window.scrollTo({ top: 600, behavior: "instant" });
        const bar = document.querySelector('.searchwrap').getBoundingClientRect();
        const tr = toast.getBoundingClientRect();
        const b = document.getElementById('browseBtn'); const br = b.getBoundingClientRect();
        const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
        window.scrollTo({ top: 0, behavior: "instant" });
        return { toastTop: Math.round(tr.top), barBottom: Math.round(bar.bottom), stuck: Math.round(bar.top) === 0,
                 hitsButton: hit === b || b.contains(hit), pointerEvents: getComputedStyle(toast).pointerEvents };
      })()`);
      t.check("Toast sits below the stuck search row (not on the Topic/home buttons)", !!geo && geo.stuck && geo.toastTop >= geo.barBottom, geo && `toast top ${geo.toastTop}px vs stuck bar bottom ${geo.barBottom}px`);
      t.check("A tap on the Topic button reaches the button while the toast is up", !!geo && geo.hitsButton, geo && `elementFromPoint hits button: ${geo.hitsButton}`);
      t.check("Toast is pointer-transparent (non-interactive status)", !!geo && geo.pointerEvents === "none", geo && geo.pointerEvents);
    });

  // 3 ─ home
  await frame("03-home", "Home — Game Time grid",
    "The coach taps 'Later' on the banner. The home screen is built for zero typing: the Score check tile first, then eight one-tap cards for the questions that come up every Saturday.",
    async (t) => {
      t.step("Tap 'Later' on the install banner");
      await page.tap(".install-later");
      t.check("Banner dismissed", !(await page.exists(".install-banner")));
      t.check("Quiet 'Add this app to your phone' link appears in the footer", await page.exists(".install-foot"));
      t.check("Home shows 'Game time — one tap' then 'Common situations'", includes(await page.text("#results"), "Game time") && includes(await page.text("#results"), "Common situations"));
      t.check("Score check is the first tile", includes(await page.text(".quick-grid .quick"), "Score check"));
      t.check("No result card is open on the home screen", (await page.count(".card.open")) === 0);
      t.check("No Recent row yet (nothing opened)", !(await page.exists(".recent-row")));
      t.check("Address bar is clean (no query string)", (await page.url()) === "", await page.url());
    });

  // 4 ─ install sheet
  await frame("04-install-sheet", "Add to your phone — step sheet",
    "Later that week the coach decides to install after all. The footer link explains the browser's Install / Add to Home Screen steps (iOS gets Safari's Share-sheet steps instead).",
    async (t) => {
      t.step("Tap the footer link 'Add this app to your phone'");
      await page.tap(".install-foot");
      const sheet = await page.waitFor("!!document.querySelector('.install-steps')", 1500, "install sheet").catch(() => false);
      if (!sheet) { t.skip("No step sheet appeared (native install dialog path)."); return; }
      t.check("Step-by-step install sheet opens", sheet);
      t.check("Sheet has 3 numbered steps", (await page.count(".install-steps li")) === 3);
      t.check("Sheet promises offline use at the field", includes(await page.text(".install-note"), "no signal"));
    });
  if (await page.exists(".install-close")) { await page.tap(".install-close"); }

  // 5 ─ category sheet
  await frame("05-topic-sheet", "Filter by category",
    "The coach doesn't know the exact words, only the area: weigh-in. The Topic button opens a two-column sheet of the rulebook's 12 categories plus 'All topics'.",
    async (t) => {
      t.step("Tap the 'Topic' button in the sticky search row");
      await page.tap("#browseBtn");
      t.check("Category sheet is visible", await page.visible("#catSheet"));
      t.check("Button reports aria-expanded=true", (await page.eval("document.getElementById('browseBtn').getAttribute('aria-expanded')")) === "true");
      t.check("13 options: 'All topics' + 12 categories", (await page.count("#catOptions .level-option")) === 13, await page.count("#catOptions .level-option"));
      t.check("'All topics' is the active choice by default", await page.eval("document.querySelector('#catOptions .cat-option-all').classList.contains('active')"));
    });

  // 6 ─ filtered list
  await frame("06-category-filter", "Weigh-In category",
    "Tapping 'Weigh-In' narrows the list to just that section of the book. The button itself now reads 'Weigh-In' so the active filter is never hidden, and a reset chip sits next to the count.",
    async (t) => {
      t.step("Tap 'Weigh-In' in the sheet");
      await page.tap("#catOptions .level-option", { text: "Weigh-In" });
      t.check("Sheet closes after choosing", !(await page.visible("#catSheet")));
      t.check("Topic button shows the active category", (await page.text("#browseBtn")) === "Weigh-In", await page.text("#browseBtn"));
      const label = await page.text(".result-count");
      t.check("Count reads 'N in category'", /\d+ in category/.test(label), label);
      t.check("Game Time grid hides while a filter is active", !(await page.exists(".quick-grid")));
      t.check("Reset chip is offered", await page.exists(".reset-chip"));
      t.check("URL carries ?cat=weigh-in", (await page.url()) === "?cat=weigh-in", await page.url());
      t.check("Every visible card is a weigh-in rule", await page.eval("Array.from(document.querySelectorAll('.card .cite-mini')).every(c => /Part II §2|Part I|§2/.test(c.textContent))"));
      t.step("Re-open the sheet and press Escape (keyboard close)");
      await page.tap("#browseBtn");
      await page.key("Escape", "Escape", 27);
      t.check("Escape closes the sheet", !(await page.visible("#catSheet")));
      t.check("Focus returns to the Topic button", (await page.eval("document.activeElement && document.activeElement.id")) === "browseBtn");
    });

  // 7 ─ search
  await frame("07-search-best-match", "Search — 'late weigh in'",
    "A player shows up after weigh-ins closed. The coach types three words; the top hit opens pre-expanded as 'Best match' with the plain-English ruling, the citation and the query terms highlighted.",
    async (t) => {
      t.step("Tap '↺ reset' to clear the filter");
      await page.tap(".reset-chip");
      t.check("Reset returns to home", await page.exists(".quick-grid") && (await page.text("#browseBtn")) === "Topic");
      t.step("Type 'late weigh in' into the search box");
      await page.type("#q", "late weigh in");
      t.check("Clear × button appears", await page.visible("#clearBtn"));
      t.check("First result is open and tagged 'Best match'", (await page.text(".card.open.spotlight .best")) === "Best match");
      t.check("Best match is the late-player situation", includes(await page.text(".card.open .q"), "late"), await page.text(".card.open .q"));
      t.check("Its ruling is about the weigh-in", includes(await page.text(".card.open .a"), "weigh"), await page.text(".card.open .a"));
      t.check("Citation badge shown in the open card", await page.exists(".card.open .cite"));
      t.check("Query terms are highlighted", (await page.count(".card.open mark")) > 0);
      const label = await page.text(".result-count");
      t.check("Count reads 'N matches'", /\d+ match/.test(label), label);
      t.check("URL carries ?q=late+weigh+in", (await page.url()) === "?q=late+weigh+in", await page.url());
    });

  // 8 ─ official text
  await frame("08-official-rule-text", "Advanced — official rule text",
    "The other coach disputes the call. One tap on 'Advanced' reveals the rulebook's own wording under the plain-English answer, so the argument ends with the book, not with memory.",
    async (t) => {
      t.step("Tap 'Advanced — official rule text' in the open card");
      await page.tap(".card.open .adv summary");
      t.check("Disclosure is open", await page.eval("document.querySelector('.card.open .adv').open"));
      t.check("Official rule block names the citation", includes(await page.text(".card.open .fulltext .ft-title"), "Official rule"));
      t.check("Rule text is non-trivial (>80 chars)", (await page.text(".card.open .fulltext")).length > 80);
      await page.scrollTo(".card.open");
    });

  // 9 ─ share
  await frame("09-share-link", "Share this rule",
    "The coach wants to send exactly this ruling to the team group chat. The share icon builds a ?doc= deep link and hands it to the phone's share sheet (or copies it where that isn't available).",
    async (t) => {
      t.step("Tap the share icon on the open card (OS share sheet replaced by a recorder)");
      await page.tap(".card.open .share-btn");
      const shared = await page.eval("window.__e2eShares[window.__e2eShares.length - 1] || null");
      t.check("navigator.share was called once", (await page.eval("window.__e2eShares.length")) === 1);
      t.check("Shared URL is this card's ?doc= deep link", !!shared && /\?doc=sit%3AS-late-player$/.test(shared.url), shared && shared.url);
      t.check("Shared title is the card's question", !!shared && includes(shared.title, "late"), shared && shared.title);
      t.check("The open card stays open (share does not toggle it)", await page.exists(".card.open"));
      t.step("Reload the shared URL later in frame 26 to prove it lands on the card");
    });

  // 10 ─ empty
  await frame("10-no-results", "No rule found — NFHS fallback",
    "The coach types something the GEJFA book never mentions. The app must not invent an answer: it suggests rephrasing and states that NFHS high-school rules apply.",
    async (t) => {
      t.step("Tap × to clear, then type 'zamboni'");
      await page.tap("#clearBtn");
      t.check("Clear empties the box and returns home", (await page.eval("document.getElementById('q').value")) === "" && await page.exists(".quick-grid"));
      await page.type("#q", "zamboni");
      t.check("Empty state is shown", await page.exists(".empty"));
      t.check("Empty state says NFHS rules apply", includes(await page.text(".empty"), "NFHS"));
      t.check("No cards rendered", (await page.count(".card")) === 0);
    });

  // 11 ─ launcher
  await frame("11-score-launcher", "Typed score → Score check launcher",
    "Up 28-0, the coach just types the score. The search box recognises it and offers a one-tap launcher into the Score check flow, pre-filled, above whatever else matched.",
    async (t) => {
      t.step("Clear, then type '28-0'");
      await page.tap("#clearBtn");
      await page.type("#q", "28-0");
      t.check("Launcher card appears", await page.exists(".flow-launch"));
      t.check("Launcher shows the parsed score 28–0", includes(await page.text(".flow-launch"), "28–0"), await page.text(".flow-launch"));
      t.check("Regular matches still listed beneath", (await page.count(".card")) > 0);
    });

  // 12 ─ from launcher
  await frame("12-flow-from-launcher", "Launcher skips straight to 'Which level?'",
    "Tapping the launcher opens the flow with the score already answered (shown as an editable chip), so the next question is the level.",
    async (t) => {
      t.step("Tap the launcher");
      await page.tap(".flow-launch");
      t.check("Search box is emptied (flow takes over the view)", (await page.eval("document.getElementById('q').value")) === "");
      t.check("Score chip reads 28–0", includes(await page.text(".flow-chips"), "28–0"), await page.text(".flow-chips"));
      t.check("Current prompt is 'Which level?'", (await page.text(".flow-prompt")) === "Which level?", await page.text(".flow-prompt"));
      t.check("Five level options", (await page.count(".flow-opt")) === 5);
      t.check("URL is ?flow=score&us=28&them=0", (await page.url()) === "?flow=score&us=28&them=0", await page.url());
    });

  // 13 ─ reset home + tile → score step
  await frame("13-flow-step-score", "Score check — What's the score?",
    "Back on the home screen, the coach taps the Score check tile. Two big numeric fields (Us / Them) with the first one already focused, so thumbs go straight to the keypad.",
    async (t) => {
      t.step("Tap the home/reset button in the search row");
      await page.tap("#resetHomeBtn");
      t.check("Reset button returns to home with a clean URL", await page.exists(".quick-grid") && (await page.url()) === "");
      t.step("Tap the 'Score check' tile");
      await page.tap(".quick-flow");
      t.check("Prompt is 'What's the score?'", includes(await page.text(".flow-prompt"), "What's the score"), await page.text(".flow-prompt"));
      t.check("Us and Them fields rendered with numeric keypad", (await page.count(".flow-score input[inputmode=numeric]")) === 2);
      t.check("'Us' field is focused automatically", (await page.eval("document.activeElement && document.activeElement.name")) === "us");
      t.check("URL is ?flow=score", (await page.url()) === "?flow=score", await page.url());
    });

  // 14 ─ validation
  await frame("14-flow-validation", "Score check — both scores required",
    "Tapping Next with an empty field doesn't advance. A small status toast asks for both scores, and the form stays put.",
    async (t) => {
      t.step("Tap 'Next' with both fields empty");
      await page.tap(".flow-go");
      const toast = await page.waitFor("(() => { const t = document.querySelector('.toast-info'); return t ? t.textContent : ''; })()", 1500, "validation toast").catch(() => "");
      t.check("Toast says 'Enter both scores'", includes(toast, "Enter both scores"), toast || "(no toast)");
      t.check("Still on the score step", await page.exists(".flow-score"));
      t.step("Read the toast and let it auto-dismiss");
      await page.waitFor("!document.querySelector('.toast-info')", 6000, "toast to clear");
    });

  // 15 ─ level
  await frame("15-flow-step-level", "Score check — Which level?",
    "The coach enters 28 and 0 and taps Next. The score collapses into a chip (tap it later to change), and the level question shows five large buttons.",
    async (t) => {
      t.step("Type 28 in Us, 0 in Them, tap Next");
      await page.type('input[name="us"]', "28");
      await page.type('input[name="them"]', "0");
      await page.tap(".flow-go");
      t.check("Score chip reads 28–0", includes(await page.text(".flow-chips"), "28–0"));
      t.check("Prompt is 'Which level?'", (await page.text(".flow-prompt")) === "Which level?");
      t.check("Rookie … Varsity options present", includes(await page.text(".flow-opts"), "Rookie") && includes(await page.text(".flow-opts"), "Varsity"));
    });

  // 16 ─ situation
  await frame("16-flow-step-situation", "Score check — What's happening?",
    "Varsity chosen. Now the app needs to know the game state: who has the ball, did someone just score, is it halftime, is the game over.",
    async (t) => {
      t.step("Tap 'Varsity'");
      await page.tap(".flow-opt", { text: "Varsity" });
      t.check("Chips: 28–0 and Varsity", includes(await page.text(".flow-chips"), "Varsity"));
      t.check("Prompt is 'What's happening?'", includes(await page.text(".flow-prompt"), "What's happening"));
      t.check("Six situation options", (await page.count(".flow-opt")) === 6, await page.count(".flow-opt"));
    });

  // 17 ─ time
  await frame("17-flow-step-time", "Score check — Where are we in the game?",
    "'We have the ball.' The last question is the clock, because the 4th-quarter-under-4:00 rules differ from the rest of the game.",
    async (t) => {
      t.step("Tap 'We have the ball'");
      await page.tap(".flow-opt", { text: "We have the ball" });
      t.check("Prompt asks where we are in the game", includes(await page.text(".flow-prompt"), "Where are we"));
      t.check("Three time options", (await page.count(".flow-opt")) === 3);
      t.check("URL carries score, level and situation", (await page.url()) === "?flow=score&us=28&them=0&lvl=varsity&sit=ball-us", await page.url());
    });

  // 18 ─ result
  await frame("18-flow-result", "The call — up 28, protocol in effect",
    "'4th qtr, over 4:00.' The app resolves the situation from the rulebook's literal thresholds: at 25+ the protocol is on, a field goal keeps the lead at 31 (OK), any touchdown goes over 32. Every callout cites its rule.",
    async (t) => {
      t.step("Tap '4th qtr, over 4:00'");
      await page.tap(".flow-opt", { text: "4th qtr, over 4:00" });
      t.check("Status line: Up 28", includes(await page.text(".flow-score-line"), "Up 28"), await page.text(".flow-score-line"));
      t.check("Regime names the 25-point protocol", includes(await page.text(".flow-regime"), "protocol"), await page.text(".flow-regime"));
      t.check("Detail: 4 more points keeps it at or under 32", includes(await page.text(".flow-detail"), "4 more"), await page.text(".flow-detail"));
      const rows = await page.eval("Array.from(document.querySelectorAll('.flow-stat')).map(r => r.textContent.replace(/\\s+/g,' ').trim())");
      t.check("Field goal → up 31, OK", rows.some(r => r.includes("Field goal") && r.includes("up 31") && r.includes("OK")), rows.join(" | "));
      t.check("Touchdown → up 34, Over 32", rows.some(r => r.includes("Touchdown") && r.includes("up 34") && r.includes("Over 32")));
      t.check("TD + kick PAT → up 36, Over 32", rows.some(r => r.includes("kick PAT") && r.includes("up 36") && r.includes("Over 32")));
      t.check("No value is drawn as a filled bar (text stat rows only)", (await page.count(".flow-table progress, .flow-table meter")) === 0);
      t.check("Callouts rendered with STOP / OPTION / NOTE eyebrows", (await page.count(".flow-call")) >= 3 && includes(await page.text(".flow-call .flow-eyebrow"), "Stop"));
      t.check("Rule-cited callouts carry a citation chip", (await page.count(".flow-call .flow-rule")) >= 3, await page.count(".flow-call .flow-rule"));
      t.step("Tap 'Share this check'");
      await page.tap(".flow-share");
      const shared = await page.eval("window.__e2eShares[window.__e2eShares.length - 1] || null");
      t.check("'Share this check' hands the full flow URL to the share sheet", !!shared && shared.url.endsWith("?flow=score&us=28&them=0&lvl=varsity&sit=ball-us&time=q4"), shared && shared.url);
      t.check("URL reproduces the finished check", (await page.url()) === "?flow=score&us=28&them=0&lvl=varsity&sit=ball-us&time=q4", await page.url());
      await page.scrollTo(".flow-status");
    });

  // 19 ─ inline rule
  await frame("19-flow-callout-rule", "Callout → official rule inline",
    "The coach taps the citation chip under the first STOP callout. The official rule text expands right there, with 'Open this rule' to jump to the full card.",
    async (t) => {
      t.step("Tap the citation chip on the first callout");
      await page.tap(".flow-call .flow-rule");
      t.check("Rule card expands", await page.visible(".flow-rule-card"));
      t.check("aria-expanded flips to true", (await page.eval("document.querySelector('.flow-rule').getAttribute('aria-expanded')")) === "true");
      t.check("Shows 'Official rule — Part II §10…'", includes(await page.text(".flow-rule-card .ft-title"), "Official rule"), await page.text(".flow-rule-card .ft-title"));
      t.check("'Open this rule ›' offered", await page.exists(".flow-open-rule"));
      await page.scrollTo(".flow-call");
    });

  // 20 ─ edit chip → rookie
  await frame("20-flow-edit-rookie", "Change one answer — Rookie (8-player)",
    "Wrong level. The coach taps the 'Varsity' chip, picks Rookie instead, and the call re-renders without re-asking the rest: no field-goal row (8-player has none) and the Rookie-specific yard line.",
    async (t) => {
      t.step("Tap the 'Varsity ✎' chip");
      await page.tap('.flow-edit[data-step="lvl"]');
      t.check("Back at 'Which level?' with the score chip kept", (await page.text(".flow-prompt")) === "Which level?" && includes(await page.text(".flow-chips"), "28–0"));
      t.step("Tap 'Rookie (8-player)'");
      await page.tap(".flow-opt", { text: "Rookie" });
      t.check("Result renders immediately (situation and time were kept)", await page.exists(".flow-result"));
      const rows = await page.eval("Array.from(document.querySelectorAll('.flow-stat')).map(r => r.textContent.replace(/\\s+/g,' ').trim())");
      t.check("No 'Field goal' row at Rookie", !rows.some(r => r.includes("Field goal")), rows.join(" | "));
      t.check("A callout explains there is no field goal in 8-player", includes(await page.text(".flow-result"), "field goal"));
      t.check("URL now says lvl=rookie", (await page.url()) === "?flow=score&us=28&them=0&lvl=rookie&sit=ball-us&time=q4", await page.url());
    });

  // 21 ─ open rule from flow
  await frame("21-open-rule-from-flow", "Open this rule → full rule card",
    "From the inline rule, 'Open this rule' jumps to the complete card for Part II §10 with the eyebrow 'From score check', so the coach knows exactly how they got here.",
    async (t) => {
      t.step("Tap the citation chip, then 'Open this rule ›'");
      await page.tap(".flow-call .flow-rule");
      await page.tap(".flow-open-rule");
      t.check("Single topic view with eyebrow 'From score check'", (await page.text(".card.open .best")) === "From score check", await page.text(".card.open .best"));
      t.check("Card cites Part II §10", includes(await page.text(".card.open .cite"), "§10"), await page.text(".card.open .cite"));
      t.check("Section diagram rendered for this rule", await page.exists(".card.open .dgm-wrap svg"));
      t.check("URL is a ?doc=rule: deep link", /^\?doc=rule%3AII-10/.test(await page.url()), await page.url());
      t.check("'← All topics' offered", await page.exists(".back-home"));
    });

  // 22 ─ Game Time tile
  await frame("22-game-time-tile", "One-tap card — 'Onside option'",
    "Down late and needing the ball back. From home the coach taps 'Onside option': one card, eyebrow matching the tile they tapped, ruling, citation and the rule text.",
    async (t) => {
      t.step("Tap '← All topics', then the 'Onside option' tile");
      await page.tap(".back-home");
      t.check("Home again", await page.exists(".quick-grid"));
      await page.tap(".quick", { text: "Onside option" });
      t.check("Eyebrow repeats the tile label", (await page.text(".card.open .best")) === "Onside option", await page.text(".card.open .best"));
      t.check("Question is the onside situation", includes(await page.text(".card.open .q"), "onside"), await page.text(".card.open .q"));
      t.check("Cites Part II §8", includes(await page.text(".card.open .cite"), "§8"), await page.text(".card.open .cite"));
      t.check("URL is ?doc=sit%3AS-onside", (await page.url()) === "?doc=sit%3AS-onside", await page.url());
    });

  // 23 ─ recents
  await frame("23-recents", "Home — Recent row",
    "Back home, the last topics opened sit in a Recent row (kept on the phone, max 6), so the same question at the next game is one tap.",
    async (t) => {
      t.step("Tap '← All topics'");
      await page.tap(".back-home");
      const recents = await page.eval("Array.from(document.querySelectorAll('.recent')).map(b => b.textContent.trim())");
      t.check("Recent row is present", recents.length >= 2, recents.join(" | "));
      t.check("Most recent first: the onside question", includes(recents[0] || "", "onside"), recents[0]);
      t.check("Recent row holds at most 6", recents.length <= 6);
      t.check("Recents persisted in localStorage", await page.eval("!!localStorage.getItem('gejfa-recents-v1')"));
    });

  // 24 ─ deep link: finished flow
  await frame("24-deeplink-flow", "Deep link — a finished Score check",
    "A coach opens a shared link on their own phone. The full URL reproduces the exact finished check (28–0, Varsity, we have the ball, 4th over 4:00) with no taps.",
    async (t) => {
      t.step("Load /?flow=score&us=28&them=0&lvl=varsity&sit=ball-us&time=q4 fresh");
      await page.goto("/?flow=score&us=28&them=0&lvl=varsity&sit=ball-us&time=q4");
      t.check("Result renders directly", await page.exists(".flow-result"));
      t.check("Status: Up 28", includes(await page.text(".flow-score-line"), "Up 28"));
      t.check("Four answer chips", (await page.count(".flow-edit")) === 4, await page.count(".flow-edit"));
      t.check("Field goal row present at Varsity", includes(await page.text(".flow-table"), "Field goal"));
    });

  // 25 ─ deep link: partial flow
  await frame("25-deeplink-partial", "Deep link — a half-finished check",
    "A partial link (score only, with an unknown level value) reopens at the next unanswered step; the bad value is dropped rather than trusted.",
    async (t) => {
      t.step("Load /?flow=score&us=28&them=0&lvl=bogus");
      await page.goto("/?flow=score&us=28&them=0&lvl=bogus");
      t.check("Opens at 'Which level?'", (await page.text(".flow-prompt")) === "Which level?", await page.text(".flow-prompt"));
      t.check("Unknown lvl=bogus was cleaned out of the URL", (await page.url()) === "?flow=score&us=28&them=0", await page.url());
    });

  // 26 ─ deep link: topic
  await frame("26-deeplink-topic", "Deep link — one situation card",
    "The link the coach shared in frame 9 lands directly on that card, opened, with its citation and 'All topics' escape.",
    async (t) => {
      t.step("Load /?doc=sit:S-turnover-subs");
      await page.goto("/?doc=sit%3AS-turnover-subs");
      t.check("Topic view with the card open", (await page.count(".card.open")) === 1);
      t.check("It is the turnover/subs situation", includes(await page.text(".card.open .q"), "turned it over"), await page.text(".card.open .q"));
      t.check("Eyebrow reads 'Topic'", (await page.text(".card.open .best")) === "Topic");
    });

  // 27 ─ deep link: search + category
  await frame("27-deeplink-search-filter", "Deep link — search inside a category",
    "A bookmarked view: 'ejected' filtered to Ejections & Discipline. Both the query and the filter are restored from the URL on load.",
    async (t) => {
      t.step("Load /?q=ejected&cat=discipline");
      await page.goto("/?q=ejected&cat=discipline");
      t.check("Search box prefilled with 'ejected'", (await page.eval("document.getElementById('q').value")) === "ejected");
      t.check("Topic button shows the category", (await page.text("#browseBtn")) === "Ejections & Discipline", await page.text("#browseBtn"));
      t.check("Best match is open", await page.exists(".card.open.spotlight"));
      t.check("URL keeps both parameters", (await page.url()) === "?q=ejected&cat=discipline", await page.url());
    });

  // 28 ─ offline
  await frame("28-offline-reload", "Offline at the field",
    "Saturday, no bars. The browser is forced offline and the app is reloaded: it must come up from the service-worker cache — every rule, and even the PDF, still served.",
    async (t) => {
      t.step("Wait for the service worker to control the page, then emulate offline");
      await page.eval("navigator.serviceWorker.ready.then(() => true)");
      t.check("Page is controlled by the service worker", await page.eval("!!navigator.serviceWorker.controller"));
      await page.setOffline(true);
      t.check("navigator.onLine reports offline", (await page.eval("navigator.onLine")) === false);
      t.step("Reload the home screen while offline");
      await page.goto("/");
      t.check("Home renders from cache: 9 Game Time tiles", (await page.count(".quick-grid .quick")) === 9, await page.count(".quick-grid .quick"));
      t.check(`Footer version still ${EXPECTED_VERSION}`, (await page.text("#appVersion")) === EXPECTED_VERSION);
      t.step("Type 'overtime' while still offline");
      await page.type("#q", "overtime");
      t.check("Search works offline", (await page.count(".card")) > 0 && includes(await page.text(".card.open .q"), "overtime"), await page.text(".card.open .q"));
      const pdfOk = await page.eval("fetch('2025-gejfa-rules.pdf').then(r => r.ok).catch(() => false)");
      t.check("The official PDF is served from the offline cache", pdfOk);
      const fontOk = await page.eval("document.fonts.check('16px Graduate')");
      t.check("Self-hosted display font available offline", fontOk);
      await page.scrollTo("body");
    });
  await page.setOffline(false);

  // 29 ─ reset from search
  await frame("29-reset-home", "Reset — back to home",
    "Whatever screen the coach is on, the home button in the search row is a pure UI reset: clears the search, the filter and any open card, and scrolls to the top. Nothing is deleted.",
    async (t) => {
      t.step("Tap the home/reset button");
      await page.tap("#resetHomeBtn");
      t.check("Search box empty", (await page.eval("document.getElementById('q').value")) === "");
      t.check("Home grid back", await page.exists(".quick-grid"));
      t.check("Recent row survived the reset (reset is not destructive)", await page.exists(".recent-row"));
      t.check("Clean URL", (await page.url()) === "", await page.url());
      t.check("No uncaught errors during the whole run", page.consoleErrors.length === 0, page.consoleErrors.join(" || "));
    });
} finally {
  const manifest = {
    app: "Skyline Spartans — GEJFA Rules 2025", version: EXPECTED_VERSION, browser, viewport: VIEWPORT, scale: SCALE,
    startedAt, finishedAt: new Date().toISOString(),
    totals: {
      frames: frames.length,
      checks: frames.reduce((n, f) => n + f.checks.length, 0),
      passed: frames.reduce((n, f) => n + f.checks.filter(c => c.pass).length, 0),
      failed: frames.reduce((n, f) => n + f.checks.filter(c => !c.pass).length, 0) + frames.filter(f => f.error).length,
      skipped: frames.filter(f => f.skipped).length,
    },
    frames,
  };
  writeFileSync(join(OUT, "frames.json"), JSON.stringify(manifest, null, 2));
  await cdp.send("Browser.close").catch(() => {});
  ws.close(); srv.close();
  await Promise.race([
    new Promise((ok) => child.exitCode !== null ? ok() : child.once("exit", ok)),
    sleep(10000).then(() => { try { child.kill(); } catch {} }),
  ]);
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  const t = manifest.totals;
  console.log(`\n${t.frames} frames · ${t.passed}/${t.checks} checks passed · ${t.failed} failed · ${t.skipped} skipped → ${OUT}`);
}
process.exit(failures ? 1 : 0);
