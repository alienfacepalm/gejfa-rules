#!/usr/bin/env node
/* README screenshot generator — keeps the marketing shots in sync with the app.
 *
 *   pnpm screenshots
 *
 * Serves docs/ on a local port, launches a headless Chromium (Chrome or Edge,
 * whichever is installed; override with BROWSER_BIN=<path>), drives it over the
 * DevTools Protocol with an explicit phone viewport, and captures one PNG per
 * entry in SHOTS into screenshots/. Run it whenever a widget is added or
 * changed, then commit the PNGs with the change (SPEC.md §9).
 *
 * No dependencies beyond Node 22+ (built-in WebSocket) and an installed browser.
 *
 * Why DevTools and not `--screenshot`: Chrome's `--window-size` is not a
 * viewport. On Windows the headless window gets clamped to a minimum width
 * and scaled by the OS DPI setting, so a "390px" capture laid the page out at
 * ~490 CSS px and clipped the right edge. Emulation.setDeviceMetricsOverride
 * sets the CSS viewport directly and is what Playwright/Puppeteer use. */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const OUT = join(ROOT, "screenshots");
const VIEWPORT = { width: 390, height: 844 }; // iPhone-class; README shots are phone-first
const SCALE = 2;                               // crisp on retina READMEs
const SETTLE_MS = 1200;                        // after load + fonts: let the app's own timers finish

/* Each entry: output file name → the app URL (query string) it shows.
 * Add a line here when you add a widget; the README references these names. */
const SHOTS = [
  ["home",        "/?shot=1"],
  ["score-check", "/?shot=1&flow=score&us=28&them=0&lvl=varsity&sit=ball-us&time=q4"],
  ["search",      "/?shot=1&q=late+weigh+in"],
  ["topic",       "/?shot=1&doc=sit:S-turnover-subs"],
];
// `shot=1` tells app.js to suppress the first-visit install banner and the
// service-worker status toasts so the capture shows the app, not the chrome.

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
  if (!hit) {
    console.error("No Chromium-based browser found. Set BROWSER_BIN=<path to msedge/chrome>.");
    process.exit(1);
  }
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
    srv.listen(0, "127.0.0.1", () => ok(srv)); // port 0 = any free port
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---- Minimal DevTools Protocol client (flat session mode) ---------------- */

/* Launch one headless browser on a throwaway profile with the DevTools port
   chosen by the OS; Chrome writes the port + browser endpoint into
   <profile>/DevToolsActivePort once it is ready. */
async function launch(browser) {
  const profile = mkdtempSync(join(tmpdir(), "gejfa-shot-"));
  const child = spawn(browser, [
    "--headless=new", "--disable-gpu", "--disable-extensions",
    "--no-first-run", "--no-default-browser-check",
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
  let seq = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { ok, no } = pending.get(msg.id); pending.delete(msg.id);
      msg.error ? no(new Error(`${msg.error.message} (${msg.error.data ?? ""})`)) : ok(msg.result);
    } else if (msg.method) {
      for (const fn of listeners) fn(msg);
    }
  };
  return {
    send(method, params = {}, sessionId) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((ok, no) => pending.set(id, { ok, no }));
    },
    /* Resolve when an event with this method (for this session) arrives. */
    once(method, sessionId) {
      return new Promise((ok) => {
        const fn = (msg) => { if (msg.method === method && msg.sessionId === sessionId) { listeners.delete(fn); ok(msg.params); } };
        listeners.add(fn);
      });
    },
  };
}

async function shoot(cdp, port, name, query) {
  const url = `http://127.0.0.1:${port}${query}`;
  const out = join(OUT, `${name}.png`);
  rmSync(out, { force: true });
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  try {
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: SCALE, mobile: true,
    }, sessionId);
    const loaded = cdp.once("Page.loadEventFired", sessionId);
    await cdp.send("Page.navigate", { url }, sessionId);
    await Promise.race([loaded, sleep(20000).then(() => { throw new Error("page load timed out"); })]);
    // Fonts are font-display: swap; wait for the real faces so the lockup isn't a fallback serif.
    await cdp.send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true }, sessionId);
    await sleep(SETTLE_MS);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
    writeFileSync(out, Buffer.from(data, "base64"));
    const { width, height } = await cdp.send("Runtime.evaluate", {
      expression: "({width: innerWidth, height: innerHeight})", returnByValue: true,
    }, sessionId).then(r => r.result.value);
    if (width !== VIEWPORT.width) throw new Error(`viewport was ${width}×${height}, expected ${VIEWPORT.width}×${VIEWPORT.height}`);
    console.log(`ok   screenshots/${name}.png  ←  ${query}`);
    return true;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    return false;
  } finally {
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

const browser = findBrowser();
mkdirSync(OUT, { recursive: true });
const srv = await serve();
const port = srv.address().port;
const { child, profile, ws } = await launch(browser);
const cdp = makeCdp(ws);
let failed = 0;
try {
  for (const [name, query] of SHOTS) if (!(await shoot(cdp, port, name, query))) failed++;
} finally {
  await cdp.send("Browser.close").catch(() => {});
  ws.close();
  srv.close();
  // Wait for the browser to actually exit before deleting its profile — on
  // Windows the profile's SQLite files stay locked until then (EBUSY).
  await Promise.race([
    new Promise((ok) => child.exitCode !== null ? ok() : child.once("exit", ok)),
    sleep(10000).then(() => { try { child.kill(); } catch {} }),
  ]);
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
console.log(failed ? `${failed} screenshot(s) failed.` : `All ${SHOTS.length} screenshots written to screenshots/ (browser: ${browser}).`);
process.exit(failed ? 1 : 0);
