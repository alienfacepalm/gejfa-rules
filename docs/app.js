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
  const $catPillRow = document.getElementById("catPillRow");
  const $catPill = document.getElementById("catPill");
  const $levelBtn = document.getElementById("levelBtn");
  const $levelSheet = document.getElementById("levelSheet");
  const $levelOptions = document.getElementById("levelOptions");

  const state = { query: "", category: null, level: null };

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
    state.category = id;
    const cat = id ? GEJFA_CATEGORIES.find(c => c.id === id) : null;
    $catPillRow.hidden = !cat;
    if (cat) {
      $catPill.textContent = cat.label + " ";
      const x = document.createElement("span");
      x.className = "x";
      x.setAttribute("aria-hidden", "true");
      x.textContent = "×";
      $catPill.appendChild(x);
      $catPill.setAttribute("aria-label", "Clear category filter: " + cat.label);
    }
    $browseBtn.classList.toggle("active", !!id);
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
  $catPill.addEventListener("click", () => setCategory(null));

  // ---- level filter sheet ----
  const levelChoices = [{ id: null, label: "All levels" }].concat(GEJFA_LEVELS);
  levelChoices.forEach(lv => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "level-option";
    b.textContent = lv.label;
    b.addEventListener("click", () => {
      state.level = lv.id;
      $levelBtn.textContent = lv.id ? lv.label : "All";
      $levelBtn.classList.toggle("active", !!lv.id);
      closeSheet();
      updateLevelOptions();
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
  $levelBtn.addEventListener("click", () => { updateLevelOptions(); $levelSheet.hidden = false; });
  $levelSheet.addEventListener("click", (e) => { if (e.target === $levelSheet) closeSheet(); });

  // ---- search box ----
  let debounce = null;
  $q.addEventListener("input", () => {
    state.query = $q.value;
    $clear.hidden = !$q.value;
    clearTimeout(debounce);
    debounce = setTimeout(render, 50);
  });
  $clear.addEventListener("click", () => {
    $q.value = ""; state.query = ""; $clear.hidden = true; $q.focus(); render();
  });
  $q.addEventListener("keydown", (e) => { if (e.key === "Enter") $q.blur(); });

  // ---- voice search (progressive enhancement) ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR && $mic) {
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
      rec.onerror = () => { $mic.classList.remove("listening"); rec = null; };
      try { rec.start(); } catch { rec = null; $mic.classList.remove("listening"); }
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
          ${rule ? `<div class="fulltext">
            <div class="ft-title">Official rule — ${esc(rule.cite)}</div>${esc(rule.text)}
          </div>` : ""}
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

    $results.innerHTML =
      (hasQuery ? "" : homeHTML()) +
      `<p class="result-count">${esc(label)}</p>` +
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
    const quick = e.target.closest(".quick, .recent");
    if (quick) { openDoc(quick.dataset.docid); return; }
    if (e.target.closest(".back-home")) { render(); return; }
    const card = e.target.closest(".card");
    if (card) toggleCard(card);
  });
  $results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); toggleCard(card); }
  });

  render();

  // ---- PWA: offline cache + updates ----
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    // ask the browser not to evict the offline rulebook cache
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
    navigator.serviceWorker.register("sw.js").catch(() => {});
    // when a new version activates, offer a one-tap refresh
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) { hadController = true; return; } // first install, not an update
      const t = document.createElement("button");
      t.type = "button";
      t.className = "toast";
      t.textContent = "Rulebook updated — tap to reload";
      t.addEventListener("click", () => location.reload());
      document.body.appendChild(t);
    });
  }
})();
