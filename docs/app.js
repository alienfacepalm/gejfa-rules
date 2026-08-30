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
  const $levelBtn = document.getElementById("levelBtn");
  const $levelSheet = document.getElementById("levelSheet");
  const $levelOptions = document.getElementById("levelOptions");

  const state = { query: "", category: null, level: null };

  // ---- deep-linkable filters (?q=&level=&cat=) ----
  // Lets a coach share or bookmark the exact filtered view they're looking
  // at. Uses replaceState (not pushState) so typing/filtering doesn't spam
  // browser history — the address bar always reflects the current view.
  function syncUrl() {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set("q", state.query.trim());
    if (state.level) params.set("level", state.level);
    if (state.category) params.set("cat", state.category);
    const qs = params.toString();
    const url = location.pathname + (qs ? "?" + qs : "");
    history.replaceState(null, "", url);
  }
  function readUrlParams() {
    const params = new URLSearchParams(location.search);
    return { q: params.get("q"), level: params.get("level"), cat: params.get("cat") };
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

  // ---- level filter persistence (a coach's team is usually one level all season) ----
  const LEVEL_KEY = "gejfa-level-v1";
  function getSavedLevel() {
    try { return localStorage.getItem(LEVEL_KEY) || null; } catch { return null; }
  }
  function saveLevel(id) {
    try { id ? localStorage.setItem(LEVEL_KEY, id) : localStorage.removeItem(LEVEL_KEY); } catch {}
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
    id = cat ? id : null; // guard against a stale/unknown id, same as setLevel
    state.category = id;
    // Same control language as the level filter: the button itself shows the
    // active selection (no separate pill) — this is a single-select filter,
    // not a navigation menu, and now looks and behaves like one.
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

  // ---- level filter sheet ----
  const levelChoices = [{ id: null, label: "All levels" }].concat(GEJFA_LEVELS);
  function setLevel(id, persist) {
    const lv = levelChoices.find(l => l.id === id);
    id = lv ? id : null; // guard against a stale/unknown saved level id
    state.level = id;
    $levelBtn.textContent = id ? lv.label : "All";
    $levelBtn.classList.toggle("active", !!id);
    if (persist) saveLevel(id);
    updateLevelOptions();
    syncUrl();
  }
  levelChoices.forEach(lv => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "level-option";
    b.textContent = lv.label;
    b.addEventListener("click", () => {
      setLevel(lv.id, true);
      closeSheet();
      render();
    });
    b.dataset.level = lv.id || "";
    $levelOptions.appendChild(b);
  });
  function updateLevelOptions() {
    $levelOptions.querySelectorAll(".level-option").forEach(o =>
      o.classList.toggle("active", (o.dataset.level || null) === state.level));
  }
  function closeSheet() { $levelSheet.hidden = true; }

  // ---- apply startup state: a shared link's filters win; otherwise fall
  // back to the coach's saved level (a team plays one level all season) ----
  const urlParams = readUrlParams();
  // Set query state first: setLevel/setCategory below call syncUrl(), which
  // reads state.query — set it after and the ?q= param would be dropped
  // from the address bar the instant the page loads.
  if (urlParams.q) {
    $q.value = urlParams.q;
    state.query = urlParams.q;
    $clear.hidden = false;
  }
  // An explicit level in a shared link becomes the new saved default too —
  // opening "…?level=rookie" almost certainly means that's this coach's team.
  setLevel(urlParams.level || getSavedLevel(), !!urlParams.level);
  if (urlParams.cat) setCategory(urlParams.cat);

  $levelBtn.addEventListener("click", () => { updateLevelOptions(); $levelSheet.hidden = false; });
  $levelSheet.addEventListener("click", (e) => { if (e.target === $levelSheet) closeSheet(); });

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
    setLevel(null, true); // also forgets the saved level — this is an explicit full reset
    setCategory(null); // clears the pill + browse state and re-renders
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelector(".hero").addEventListener("click", (e) => {
    if (e.target.closest(".pdf-link")) return; // PDF link keeps its own action
    resetAll();
  });

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
  function cardHTML(doc, i, terms, spotlight) {
    const isSit = doc.type === "situation";
    const heading = isSit ? doc.situation.question : doc.title;
    const answer = isSit ? doc.situation.answer : doc.answer;
    const rule = doc.rule;
    const diagram = rule ? DIAGRAMS[rule.id] : null;
    return `
      <article class="card ${isSit ? "situation" : ""} ${spotlight ? "open spotlight" : ""}"
               data-i="${i}" data-docid="${esc(doc.docId)}" tabindex="0"
               role="button" aria-expanded="${spotlight ? "true" : "false"}">
        ${spotlight ? `<p class="best">Best match</p>` : ""}
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
          <span class="chev" aria-hidden="true">▾</span>
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
    const docs = engine.search(state.query, { level: state.level, category: state.category });
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
    const activeState = hasQuery || state.category || state.level;
    const resetChip = activeState
      ? `<button type="button" class="reset-chip" aria-label="Reset to all topics">↺ reset</button>` : "";

    $results.innerHTML =
      (hasQuery ? "" : homeHTML()) +
      `<p class="result-count">${esc(label)}${resetChip}</p>` +
      docs.map((d, i) => cardHTML(d, i, terms, hasQuery && i === 0)).join("");

    if (hasQuery && docs[0]) pushRecent(docs[0].docId);
  }

  /* Focus mode: one topic open at a time; opening scrolls it under the search bar. */
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
      requestAnimationFrame(() => {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
  }

  /* Open one specific doc (quick answers, recents): render just that topic, focused. */
  function openDoc(docId) {
    const doc = engine.byDocId(docId);
    if (!doc) return;
    $q.value = ""; state.query = ""; $clear.hidden = true;
    $results.innerHTML =
      `<p class="result-count">Topic</p>` +
      cardHTML(doc, 0, [], true) +
      `<button type="button" class="back-home">← All topics</button>`;
    pushRecent(docId);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  $results.addEventListener("click", (e) => {
    if (e.target.closest(".reset-chip")) { resetAll(); return; }
    const quick = e.target.closest(".quick, .recent");
    if (quick) { openDoc(quick.dataset.docid); return; }
    if (e.target.closest(".back-home")) { render(); return; }
    if (e.target.closest(".adv")) return; // Advanced disclosure handles itself
    const card = e.target.closest(".card");
    if (card) toggleCard(card);
  });
  $results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.closest(".adv")) return; // let <summary> toggle natively
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); toggleCard(card); }
  });

  render();

  // ---- one-time install prompt (first visit only; "Later" keeps a footer link) ----
  const INSTALL_KEY = "gejfa-install-v1";
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
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
      : `<ol class="install-steps">
           <li>Open the browser menu (<strong>⋮</strong> or <strong>…</strong>)</li>
           <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>)</li>
           <li>Confirm — Spartans Rules appears like an app</li>
         </ol>`;
    sheet.innerHTML = `
      <div class="level-sheet-inner" role="dialog" aria-modal="true">
        <h2>Add to your phone</h2>
        ${steps}
        <p class="install-note">Once added, it opens full-screen and works with no signal at the field.</p>
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
    b.setAttribute("aria-label", "Add this app to your phone");
    b.innerHTML = `
      <p class="install-msg"><strong>Keep Spartans Rules on your phone.</strong>
      Add it to your home screen — it opens like an app and works offline at the field.</p>
      <div class="install-actions">
        <button type="button" class="install-yes">Add to phone</button>
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
    btn.textContent = "Add this app to your phone";
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

  /* "What's new" sheet: the latest changelog entry in the same bottom-sheet
     language as the rest of the app. `afterUpdate` swaps the single "Got it"
     dismiss for "Reload now" / "Not now", since a real update is waiting. */
  function openWhatsNewSheet(afterUpdate) {
    const entry = (typeof GEJFA_CHANGELOG !== "undefined") ? GEJFA_CHANGELOG[0] : null;
    if (!entry) return;
    const sheet = document.createElement("div");
    sheet.className = "level-sheet";
    const items = entry.changes.map(c => `<li>${esc(c)}</li>`).join("");
    sheet.innerHTML = `
      <div class="level-sheet-inner" role="dialog" aria-modal="true" aria-labelledby="whatsnewTitle">
        <h2 id="whatsnewTitle">What's new${entry.date ? " — " + esc(entry.date) : ""}</h2>
        <ul class="whatsnew-list">${items}</ul>
        ${afterUpdate
          ? `<div class="install-actions">
               <button type="button" class="install-yes whatsnew-reload">Reload now</button>
               <button type="button" class="install-later whatsnew-dismiss">Not now</button>
             </div>`
          : `<button type="button" class="back-home whatsnew-dismiss">Got it</button>`}
      </div>`;
    sheet.addEventListener("click", (e) => {
      if (e.target.closest(".whatsnew-reload")) { location.reload(); return; }
      if (e.target === sheet || e.target.closest(".whatsnew-dismiss")) sheet.remove();
    });
    document.body.appendChild(sheet);
  }

  // Let a coach revisit "what's new" anytime, not just right after an update.
  if (document.querySelector(".foot") && typeof GEJFA_CHANGELOG !== "undefined" && GEJFA_CHANGELOG.length) {
    const wnLink = document.createElement("button");
    wnLink.type = "button";
    wnLink.className = "install-foot";
    wnLink.textContent = "What's new";
    wnLink.addEventListener("click", () => openWhatsNewSheet(false));
    document.querySelector(".foot").appendChild(wnLink);
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

    // Once the new version actually takes over, show what changed with a
    // one-tap reload — this is the moment the update is fully ready to use.
    let hadController = hadControllerAtLoad;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) { hadController = true; return; } // first install, not an update
      openWhatsNewSheet(true);
    });
  }
})();
