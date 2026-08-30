/* GEJFA Rules — UI glue layer. All DOM/browser code lives here (and only here),
   so the data + search modules stay portable to a future native app. */

(function () {
  "use strict";

  const engine = createGejfaSearch({
    MiniSearch: MiniSearch,
    rules: GEJFA_RULES,
    situations: GEJFA_SITUATIONS,
    synonyms: GEJFA_SYNONYMS,
  });
  const DIAGRAMS = (typeof GEJFA_DIAGRAMS !== "undefined") ? GEJFA_DIAGRAMS : {};
  const QUICK = (typeof GEJFA_QUICK !== "undefined") ? GEJFA_QUICK : [];

  const $q = document.getElementById("q");
  const $clear = document.getElementById("clearBtn");
  const $mic = document.getElementById("micBtn");
  const $results = document.getElementById("results");
  const $browseBtn = document.getElementById("browseBtn");
  const $catSheet = document.getElementById("catSheet");
  const $catOptions = document.getElementById("catOptions");

  const state = { query: "", category: null, openDoc: null };

  // ---- deep-linkable filters (?q=&cat=&doc=) ----
  // Lets a coach share or bookmark the exact filtered view they're looking
  // at. Uses replaceState (not pushState) so typing/filtering doesn't spam
  // browser history — the address bar always reflects the current view.
  function syncUrl() {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set("q", state.query.trim());
    if (state.category) params.set("cat", state.category);
    if (state.openDoc) params.set("doc", state.openDoc);
    const qs = params.toString();
    const url = location.pathname + (qs ? "?" + qs : "");
    history.replaceState(null, "", url);
  }
  function readUrlParams() {
    const params = new URLSearchParams(location.search);
    return { q: params.get("q"), cat: params.get("cat"), doc: params.get("doc") };
  }
  function shareUrlFor(docId) {
    return location.origin + location.pathname + "?doc=" + encodeURIComponent(docId);
  }

  // ---- recents (persisted; answers themselves are all offline in the app bundle) ----
  const RECENTS_KEY = "gejfa-recents-v1";
  function getRecents() {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; } catch { return []; }
  }
  function pushRecent(docId) {
    const list = getRecents().filter(id => id !== docId);
    list.unshift(docId);
    try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(0, 6))); } catch {}
  }

  // ---- category browse drawer ----
  const catChoices = [{ id: null, label: "All topics" }].concat(GEJFA_CATEGORIES);
  catChoices.forEach(cat => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "level-option" + (cat.id ? "" : " cat-option-all");
    b.textContent = cat.label;
    b.dataset.cat = cat.id || "";
    b.addEventListener("click", () => {
      setCategory(cat.id);
      closeCatSheet();
    });
    $catOptions.appendChild(b);
  });
  function updateCatOptions() {
    $catOptions.querySelectorAll(".level-option").forEach(o =>
      o.classList.toggle("active", (o.dataset.cat || null) === state.category));
  }
  function setCategory(id) {
    const cat = id ? GEJFA_CATEGORIES.find(c => c.id === id) : null;
    id = cat ? id : null; // guard against a stale/unknown id
    state.category = id;
    // The button itself shows the active selection (no separate pill) —
    // this is a single-select filter, not a navigation menu.
    $browseBtn.textContent = cat ? cat.label : "Topic";
    $browseBtn.classList.toggle("active", !!cat);
    syncUrl();
    render();
  }
  function openCatSheet() {
    updateCatOptions();
    $catSheet.hidden = false;
    $browseBtn.setAttribute("aria-expanded", "true");
  }
  function closeCatSheet() {
    $catSheet.hidden = true;
    $browseBtn.setAttribute("aria-expanded", "false");
    $browseBtn.focus();
  }
  $browseBtn.addEventListener("click", () => {
    if ($catSheet.hidden) openCatSheet(); else closeCatSheet();
  });
  $catSheet.addEventListener("click", (e) => { if (e.target === $catSheet) closeCatSheet(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$catSheet.hidden) closeCatSheet();
  });

  // ---- apply startup state: a shared link's filters win by default ----
  const urlParams = readUrlParams();
  // Set query state first: setCategory below calls syncUrl(), which reads
  // state.query — set it after and the ?q= param would be dropped from the
  // address bar the instant the page loads.
  if (urlParams.q) {
    $q.value = urlParams.q;
    state.query = urlParams.q;
    $clear.hidden = false;
  }
  if (urlParams.cat) setCategory(urlParams.cat);
  // A shared "?doc=" link takes over the view entirely (openDoc paints the
  // single-topic screen); skip the generic initial render below if it worked.
  const openedFromLink = urlParams.doc ? openDoc(urlParams.doc) : false;

  // ---- search box ----
  let debounce = null;
  $q.addEventListener("input", () => {
    state.query = $q.value;
    $clear.hidden = !$q.value;
    clearTimeout(debounce);
    debounce = setTimeout(() => { render(); syncUrl(); }, 50);
  });
  $clear.addEventListener("click", () => {
    $q.value = ""; state.query = ""; $clear.hidden = true; $q.focus(); render(); syncUrl();
  });
  $q.addEventListener("keydown", (e) => { if (e.key === "Enter") $q.blur(); });

  // ---- sticky search-bar shadow (only once something is actually scrolled beneath it) ----
  function updateScrolled() { document.body.classList.toggle("scrolled", window.scrollY > 4); }
  window.addEventListener("scroll", updateScrolled, { passive: true });
  updateScrolled();

  // ---- reset to top level ----
  // Two quiet affordances: tap the hero crest/lockup (logo-home convention),
  // or the small "reset" chip that only appears when a query/filter is active.
  function resetAll() {
    $q.value = ""; state.query = ""; $clear.hidden = true;
    state.openDoc = null;
    setCategory(null); // clears the pill + browse state, syncs the URL, and re-renders
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelector(".hero").addEventListener("click", (e) => {
    if (e.target.closest(".pdf-link")) return; // PDF link keeps its own action
    resetAll();
  });
  document.getElementById("resetHomeBtn").addEventListener("click", resetAll);

  // ---- voice search (progressive enhancement) ----
  // Capability check on load: the button stays hidden unless the browser
  // exposes SpeechRecognition AND has media devices. If the API turns out to
  // be a stub (no service / no microphone), hide the button permanently.
  const SHOW_MIC = false; // mic hidden from the UI for now; flip to re-enable
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SHOW_MIC && SR && $mic && navigator.mediaDevices) {
    $mic.hidden = false;
    let rec = null;
    $mic.addEventListener("click", () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      $mic.classList.add("listening");
      rec.onresult = (e) => {
        const t = Array.from(e.results).map(r => r[0].transcript).join(" ");
        $q.value = t; state.query = t; $clear.hidden = !t; render();
      };
      rec.onend = () => { $mic.classList.remove("listening"); rec = null; };
      rec.onerror = (e) => {
        $mic.classList.remove("listening"); rec = null;
        // API exists but can't actually work here — remove the dead button
        if (e && (e.error === "service-not-allowed" || e.error === "audio-capture" ||
                  e.error === "language-not-supported")) {
          $mic.hidden = true;
        }
      };
      try { rec.start(); } catch { rec = null; $mic.classList.remove("listening"); $mic.hidden = true; }
    });
  }

  // ---- rendering ----
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* Highlight raw query terms (3+ chars) in already-escaped text. */
  function highlightTerms() {
    return state.query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
  }
  function mark(escaped, terms) {
    if (!terms.length) return escaped;
    let out = escaped;
    terms.forEach(t => {
      const safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp("(" + safe + "\\w*)", "gi"), "<mark>$1</mark>");
    });
    return out;
  }

  function levelsLabel(levels) {
    if (!levels || levels.includes("all")) return "All levels";
    return levels.map(id => {
      const lv = GEJFA_LEVELS.find(l => l.id === id);
      return lv ? lv.label : id;
    }).join(" · ");
  }

  /* At a glance: title + clamped short answer. Opened: full answer,
     diagram (when the section has one), citation, and official rule text.
     When `spotlight` is true the card renders pre-opened as the best match. */
  function cardHTML(doc, i, terms, spotlight, eyebrow) {
    const isSit = doc.type === "situation";
    const heading = isSit ? doc.situation.question : doc.title;
    const answer = isSit ? doc.situation.answer : doc.answer;
    const rule = doc.rule;
    const diagram = rule ? DIAGRAMS[rule.id] : null;
    return `
      <article class="card ${isSit ? "situation" : ""} ${spotlight ? "open spotlight" : ""}"
               data-i="${i}" data-docid="${esc(doc.docId)}" tabindex="0"
               role="button" aria-expanded="${spotlight ? "true" : "false"}">
        ${spotlight ? `<p class="best">${esc(eyebrow || "Best match")}</p>` : ""}
        <p class="q">${mark(esc(heading), terms)}</p>
        <p class="a">${mark(esc(answer), terms)}</p>
        <div class="detail" ${spotlight ? "" : "hidden"}>
          ${diagram ? `<div class="dgm-wrap">${diagram}</div>` : ""}
          <div class="meta">
            ${rule ? `<span class="cite">${esc(rule.cite)}</span>` : ""}
            <span class="levels-tag">${esc(levelsLabel(doc.levels))}</span>
          </div>
          ${rule ? `<details class="adv">
            <summary>Advanced — official rule text</summary>
            <div class="fulltext">
              <div class="ft-title">Official rule — ${esc(rule.cite)}</div>${esc(rule.text)}
            </div>
          </details>` : ""}
        </div>
        <div class="peek">
          ${rule ? `<span class="cite-mini">${esc(rule.cite)}</span>` : "<span></span>"}
          <span class="peek-actions">
            <button type="button" class="share-btn" data-docid="${esc(doc.docId)}" data-title="${esc(heading)}"
                    aria-label="Share this ${isSit ? "situation" : "rule"}">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18 16.08a2.9 2.9 0 0 0-1.94.75l-7.05-4.11a3 3 0 0 0 0-1.44l7.05-4.11a3 3 0 1 0-.89-1.72l-7.05 4.11a3 3 0 1 0 0 4.88l7.05 4.12a2.92 2.92 0 1 0 2.83-2.48z"/></svg>
            </button>
            <span class="chev" aria-hidden="true">▾</span>
          </span>
        </div>
      </article>`;
  }

  /* Home (empty query): Game Time one-tap grid + recents, then browse list. */
  function homeHTML() {
    let s = "";
    if (QUICK.length && !state.category) {
      s += `<p class="result-count">Game time — one tap</p><div class="quick-grid">`;
      QUICK.forEach(qk => {
        s += `<button type="button" class="quick" data-docid="sit:${esc(qk.sitId)}">${esc(qk.label)}</button>`;
      });
      s += `</div>`;
      const recents = getRecents().map(id => engine.byDocId(id)).filter(Boolean);
      if (recents.length) {
        s += `<p class="result-count">Recent</p><div class="recent-row">`;
        recents.forEach(d => {
          const label = d.type === "situation" ? d.situation.question : d.title;
          s += `<button type="button" class="recent" data-docid="${esc(d.docId)}">${esc(label)}</button>`;
        });
        s += `</div>`;
      }
    }
    return s;
  }

  function render() {
    const hasQuery = !!state.query.trim();
    const docs = engine.search(state.query, { category: state.category });
    const terms = hasQuery ? highlightTerms() : [];

    if (!docs.length) {
      $results.innerHTML = `
        <div class="empty">
          <p><strong>No rule found for that.</strong></p>
          <p>Try fewer or different words (e.g. “weigh in”, “ejected”, “subs”, “overtime”) or tap ☰ to browse by category.</p>
          <p>If it isn't covered here or in the GEJFA book, NFHS high school rules apply.</p>
        </div>`;
      return;
    }

    const label = hasQuery
      ? `${docs.length} match${docs.length === 1 ? "" : "es"}`
      : (state.category ? `${docs.length} in category` : `Common situations`);
    const activeState = hasQuery || state.category;
    const resetChip = activeState
      ? `<button type="button" class="reset-chip" aria-label="Reset to all topics">↺ reset</button>` : "";

    $results.innerHTML =
      (hasQuery ? "" : homeHTML()) +
      `<p class="result-count">${esc(label)}${resetChip}</p>` +
      docs.map((d, i) => cardHTML(d, i, terms, hasQuery && i === 0)).join("");

    if (hasQuery && docs[0]) pushRecent(docs[0].docId);
  }

  /* Focus mode: one topic open at a time; opening scrolls it under the search bar.
     The open card is deep-linkable (?doc=) so the current view is always shareable. */
  function toggleCard(card, forceOpen) {
    const isOpen = card.classList.contains("open");
    $results.querySelectorAll(".card.open").forEach(c => {
      c.classList.remove("open", "spotlight");
      c.setAttribute("aria-expanded", "false");
      const d = c.querySelector(".detail");
      if (d) d.hidden = true;
      const b = c.querySelector(".best");
      if (b) b.remove();
    });
    if (!isOpen || forceOpen) {
      card.classList.add("open");
      card.setAttribute("aria-expanded", "true");
      const d = card.querySelector(".detail");
      if (d) d.hidden = false;
      if (card.dataset.docid) pushRecent(card.dataset.docid);
      state.openDoc = card.dataset.docid || null;
      requestAnimationFrame(() => {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    } else {
      state.openDoc = null;
    }
    syncUrl();
  }

  /* Open one specific doc (quick answers, recents, a shared ?doc= link):
     render just that topic, focused, and reflect it in the URL.
     `clickedLabel` (the exact text of the button that was tapped, when
     known) is echoed back as the card's eyebrow so it's unmistakable that
     this is what was clicked — not a similar-sounding different topic. */
  function openDoc(docId, clickedLabel) {
    const doc = engine.byDocId(docId);
    if (!doc) return false;
    $q.value = ""; state.query = ""; $clear.hidden = true;
    state.openDoc = docId;
    $results.innerHTML =
      `<p class="result-count">Topic</p>` +
      cardHTML(doc, 0, [], true, clickedLabel ? `You tapped: ${clickedLabel}` : "Topic") +
      `<button type="button" class="back-home">← All topics</button>`;
    pushRecent(docId);
    syncUrl();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    return true;
  }

  /* Share the deep link to one rule/situation — free, no third-party service:
     the native OS share sheet where available, otherwise copy-to-clipboard. */
  function shareDoc(docId, title) {
    const url = shareUrlFor(docId);
    if (navigator.share) {
      navigator.share({ title: title || "GEJFA Rule", text: title || "GEJFA Rule", url }).catch(() => {
        // user cancelled the share sheet, or it failed silently — nothing to do
      });
      return;
    }
    const done = () => infoToast("Link copied");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
    } else {
      fallbackCopy(url, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch { /* nothing more to try */ }
    ta.remove();
  }

  $results.addEventListener("click", (e) => {
    if (e.target.closest(".reset-chip")) { resetAll(); return; }
    const shareBtn = e.target.closest(".share-btn");
    if (shareBtn) { shareDoc(shareBtn.dataset.docid, shareBtn.dataset.title); return; }
    const quick = e.target.closest(".quick, .recent");
    if (quick) { openDoc(quick.dataset.docid, quick.textContent); return; }
    if (e.target.closest(".back-home")) { state.openDoc = null; syncUrl(); render(); return; }
    if (e.target.closest(".adv")) return; // Advanced disclosure handles itself
    const card = e.target.closest(".card");
    if (card) toggleCard(card);
  });
  $results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.closest(".adv") || e.target.closest(".share-btn")) return; // let the native button/details handle itself
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); toggleCard(card); }
  });

  if (!openedFromLink) render();

  // ---- one-time install prompt (first visit only; "Later" keeps a footer link) ----
  const INSTALL_KEY = "gejfa-install-v1";
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  // iPadOS 13+ reports itself as "Macintosh", so touch support is the tell.
  const isIPad = /ipad/i.test(navigator.userAgent)
    || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const isIOS = /iphone|ipod/i.test(navigator.userAgent) || isIPad;
  const isAndroid = /android/i.test(navigator.userAgent);
  // What to call the device in install copy: iPhone / iPad / phone / computer.
  const deviceName = isIPad ? "iPad" : isIOS ? "iPhone" : isAndroid ? "phone" : "computer";
  const isMobile = isIOS || isAndroid;
  let deferredInstall = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
  });
  window.addEventListener("appinstalled", () => {
    try { localStorage.setItem(INSTALL_KEY, "done"); } catch {}
    removeInstallUI();
  });

  function installState() {
    try { return localStorage.getItem(INSTALL_KEY); } catch { return "later"; }
  }
  function setInstallState(v) {
    try { localStorage.setItem(INSTALL_KEY, v); } catch {}
  }
  function removeInstallUI() {
    document.querySelectorAll(".install-banner, .install-foot").forEach(el => el.remove());
  }

  function openInstallSheet() {
    const sheet = document.createElement("div");
    sheet.className = "level-sheet";
    const steps = isIOS
      ? `<ol class="install-steps">
           <li>Tap the <strong>Share</strong> button <span class="ios-share" aria-hidden="true">⎋</span> in Safari's toolbar</li>
           <li>Scroll and tap <strong>Add to Home Screen</strong></li>
           <li>Tap <strong>Add</strong> — Spartans Rules appears like an app</li>
         </ol>`
      : isAndroid
      ? `<ol class="install-steps">
           <li>Open the browser menu (<strong>⋮</strong> or <strong>…</strong>)</li>
           <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>)</li>
           <li>Confirm — Spartans Rules appears like an app</li>
         </ol>`
      : `<ol class="install-steps">
           <li>Look for the <strong>install icon</strong> at the right end of the address bar</li>
           <li>No icon? Open the browser menu (<strong>⋮</strong> or <strong>…</strong>) and choose <strong>Install app</strong> (in Safari: <strong>File → Add to Dock</strong>)</li>
           <li>Confirm — Spartans Rules opens in its own window</li>
         </ol>`;
    const title = isMobile ? `Add to your ${deviceName}` : "Install on this computer";
    const note = isMobile
      ? "Once added, it opens full-screen and works with no signal at the field."
      : "Once installed, it opens in its own window and works offline.";
    sheet.innerHTML = `
      <div class="level-sheet-inner" role="dialog" aria-modal="true">
        <h2>${title}</h2>
        ${steps}
        <p class="install-note">${note}</p>
        <button type="button" class="back-home install-close">Got it</button>
      </div>`;
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet || e.target.closest(".install-close")) sheet.remove();
    });
    document.body.appendChild(sheet);
  }

  function doInstall() {
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.then((choice) => {
        if (choice && choice.outcome === "accepted") setInstallState("done");
        deferredInstall = null;
      }).catch(() => {});
    } else {
      openInstallSheet();
    }
  }

  function showInstallBanner() {
    const b = document.createElement("div");
    b.className = "install-banner";
    b.setAttribute("role", "dialog");
    b.setAttribute("aria-label", `Add this app to your ${deviceName}`);
    const pitch = isMobile
      ? `<strong>Keep Spartans Rules on your ${deviceName}.</strong>
      Add it to your ${isIOS ? "Home Screen" : "home screen"} — it opens like an app and works offline at the field.`
      : `<strong>Keep Spartans Rules on this computer.</strong>
      Install it — it opens in its own window and works offline.`;
    b.innerHTML = `
      <p class="install-msg">${pitch}</p>
      <div class="install-actions">
        <button type="button" class="install-yes">${isMobile ? `Add to ${deviceName}` : "Install app"}</button>
        <button type="button" class="install-later">Later</button>
      </div>`;
    b.querySelector(".install-yes").addEventListener("click", () => {
      setInstallState("prompted");
      b.remove();
      doInstall();
      addFooterInstallLink(); // still reachable if they bail out of the native prompt
    });
    b.querySelector(".install-later").addEventListener("click", () => {
      setInstallState("later");
      b.remove();
      addFooterInstallLink();
    });
    document.body.appendChild(b);
  }

  /* "Decide later" path: a quiet, always-available install link in the footer. */
  function addFooterInstallLink() {
    if (isStandalone || installState() === "done") return;
    if (document.querySelector(".install-foot")) return;
    const foot = document.querySelector(".foot");
    if (!foot) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "install-foot";
    btn.textContent = isMobile ? `Add this app to your ${deviceName}` : "Install this app on your computer";
    btn.addEventListener("click", doInstall);
    foot.insertBefore(btn, foot.firstChild);
  }

  if (!isStandalone && installState() === null) {
    setTimeout(showInstallBanner, 1500); // one time only — first visit
  } else if (!isStandalone && installState() !== "done") {
    addFooterInstallLink();
  }

  // ---- PWA: full sync when online, always works offline with what's cached ----
  // Cache-first at the network layer (see sw.js) so the app is instant and
  // reliable on bad sideline signal; this section is what tells the coach,
  // in plain language, what's happening: saved for offline / downloading an
  // update / here's what changed, with a one-tap reload once it's ready.

  /* Small, non-interactive status message — auto-dismisses. For "this just
     happened" info, not for anything requiring a decision (see .toast for
     that / the install banner). */
  function infoToast(text, ms) {
    const t = document.createElement("div");
    t.className = "toast-info";
    t.setAttribute("role", "status");
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 3200);
    return t;
  }

  /* Actionable status message — clickable, stays until acted on. Used only
     for "an update is ready" (a decision the coach should make on their own
     time, not something to auto-dismiss like infoToast). */
  function actionToast(text, onClick) {
    const t = document.createElement("button");
    t.type = "button";
    t.className = "toast";
    t.textContent = text;
    t.addEventListener("click", onClick);
    document.body.appendChild(t);
    return t;
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    // ask the browser not to evict the offline rulebook cache
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
    const hadControllerAtLoad = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.register("sw.js").then((reg) => {
      // First-ever visit: confirm once everything is actually saved offline.
      if (!hadControllerAtLoad) {
        navigator.serviceWorker.ready.then(() => infoToast("Rulebook saved for offline use ✓"));
      }
      // A new version is downloading in the background — say so, since on
      // poor sideline signal this can take a few seconds.
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        const downloading = infoToast("Downloading rulebook update…", 15000);
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" || nw.state === "activated" || nw.state === "redundant") {
            downloading.remove();
          }
        });
      });
    }).catch(() => {});

    // Once the new version actually takes over, offer a one-tap reload —
    // this is the moment the update is fully ready to use.
    let hadController = hadControllerAtLoad;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) { hadController = true; return; } // first install, not an update
      actionToast("Rulebook updated — tap to reload", () => location.reload());
    });
  }
})();
