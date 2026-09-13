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
  // Guided flows (Score check): pure resolver in flows.js, data in data/flows.js.
  const FLOWS = createGejfaFlows({
    flows: GEJFA_FLOWS, callouts: GEJFA_FLOW_CALLOUTS, rules: GEJFA_RULES,
  });
  const FLOW_ANSWER_KEYS = ["us", "them", "lvl", "sit", "time"];
  // ?shot=1 — screenshot mode for `pnpm screenshots` (README images): suppresses
  // the first-visit install banner and the service-worker status toasts so the
  // captured screen is the app itself. Nothing else changes; the flag is not
  // carried into the synced URL.
  const SHOT_MODE = new URLSearchParams(location.search).has("shot");

  // Footer credit line shows the build version (version.js is the single source
  // of truth; sw.js derives its cache name from the same number).
  const $appVersion = document.getElementById("appVersion");
  if ($appVersion && typeof GEJFA_VERSION !== "undefined") $appVersion.textContent = "v" + GEJFA_VERSION;

  const $q = document.getElementById("q");
  const $clear = document.getElementById("clearBtn");
  const $mic = document.getElementById("micBtn");
  const $results = document.getElementById("results");
  const $browseBtn = document.getElementById("browseBtn");
  const $catSheet = document.getElementById("catSheet");
  const $catOptions = document.getElementById("catOptions");

  const state = { query: "", category: null, openDoc: null, flow: null };

  // ---- deep-linkable filters (?q=&cat=&doc=) and flows (?flow=&us=&them=&lvl=&sit=&time=) ----
  // Lets a coach share or bookmark the exact filtered view they're looking
  // at. Uses replaceState (not pushState) so typing/filtering doesn't spam
  // browser history — the address bar always reflects the current view.
  function syncUrl() {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set("q", state.query.trim());
    if (state.category) params.set("cat", state.category);
    if (state.openDoc) params.set("doc", state.openDoc);
    if (state.flow) {
      // Every answered step rides along, so a half-finished or finished
      // Score check reloads / shares to exactly the same screen.
      params.set("flow", state.flow.id);
      FLOW_ANSWER_KEYS.forEach(k => {
        const v = state.flow.answers[k];
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
    }
    const qs = params.toString();
    const url = location.pathname + (qs ? "?" + qs : "");
    history.replaceState(null, "", url);
  }
  function readUrlParams() {
    const params = new URLSearchParams(location.search); // ?shot= is read once at startup (SHOT_MODE) and never re-synced
    const num = (k) => {
      const v = params.get(k);
      return v !== null && /^\d{1,3}$/.test(v) ? parseInt(v, 10) : undefined;
    };
    const flow = params.get("flow");
    return {
      q: params.get("q"), cat: params.get("cat"), doc: params.get("doc"), flow,
      answers: flow ? {
        us: num("us"), them: num("them"),
        lvl: params.get("lvl") || undefined, sit: params.get("sit") || undefined,
        time: params.get("time") || undefined,
      } : null,
    };
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
    state.flow = null; // filtering is a list-view action; leave any open flow
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
  // A shared "?flow=" or "?doc=" link takes over the view entirely (openFlow /
  // openDoc paint a single screen); skip the generic initial render below if it worked.
  const openedFromLink = urlParams.flow ? openFlow(urlParams.flow, urlParams.answers)
                       : urlParams.doc ? openDoc(urlParams.doc) : false;

  // ---- search box ----
  let debounce = null;
  $q.addEventListener("input", () => {
    state.query = $q.value;
    state.flow = null; // typing returns to the list view
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
    state.flow = null;
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
        s += qk.flowId
          ? `<button type="button" class="quick quick-flow" data-flowid="${esc(qk.flowId)}">${esc(qk.label)}</button>`
          : `<button type="button" class="quick" data-docid="sit:${esc(qk.sitId)}">${esc(qk.label)}</button>`;
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

  /* A typed score ("28-0", "up 28") gets a one-tap launcher into the Score
     check flow, prefilled, above whatever the search found. */
  function flowLauncherHTML() {
    const parsed = FLOWS.parseScoreQuery(state.query);
    if (!parsed) return "";
    return `<button type="button" class="flow-launch" data-us="${parsed.us}" data-them="${parsed.them}">
        <span class="flow-launch-eyebrow">Score check</span>
        ${esc(parsed.us + "–" + parsed.them)} — what's legal right now? <span aria-hidden="true">›</span>
      </button>`;
  }

  function render() {
    state.flow = null; // the list view is never a flow
    const hasQuery = !!state.query.trim();
    const docs = engine.search(state.query, { category: state.category });
    const terms = hasQuery ? highlightTerms() : [];
    const launcher = hasQuery ? flowLauncherHTML() : "";

    if (!docs.length) {
      $results.innerHTML = launcher + `
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
      launcher +
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
     known) becomes the card's eyebrow so it's unmistakable that this is
     what was clicked — not a similar-sounding different topic. */
  function openDoc(docId, clickedLabel) {
    const doc = engine.byDocId(docId);
    if (!doc) return false;
    $q.value = ""; state.query = ""; $clear.hidden = true;
    state.flow = null;
    state.openDoc = docId;
    $results.innerHTML =
      `<p class="result-count">Topic</p>` +
      cardHTML(doc, 0, [], true, clickedLabel || "Topic") +
      `<button type="button" class="back-home">← All topics</button>`;
    pushRecent(docId);
    syncUrl();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    return true;
  }

  /* ---- Guided flow: Score check ----
     One screen, rendered into #results like openDoc(). Answered steps collapse
     to tappable chips (tap to change), the current step shows big buttons or
     the two score fields, and once every applicable step is answered the
     resolver's "call" renders beneath. All arithmetic and rule selection is in
     flows.js (portable); this is only paint + events. */
  function openFlow(flowId, answers) {
    const flow = FLOWS.get(flowId);
    if (!flow) return false;
    $q.value = ""; state.query = ""; $clear.hidden = true;
    state.openDoc = null;
    state.flow = { id: flowId, answers: FLOWS.cleanAnswers(flowId, answers || {}) };
    renderFlow();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    return true;
  }
  function setFlowAnswer(patch) {
    if (!state.flow) return;
    const merged = Object.assign({}, state.flow.answers, patch);
    state.flow.answers = FLOWS.cleanAnswers(state.flow.id, merged);
    renderFlow();
  }
  function clearFlowStep(stepId) {
    if (!state.flow) return;
    const a = Object.assign({}, state.flow.answers);
    if (stepId === "score") { delete a.us; delete a.them; } else { delete a[stepId]; }
    state.flow.answers = FLOWS.cleanAnswers(state.flow.id, a);
    renderFlow();
  }
  function renderFlow() {
    const flow = FLOWS.get(state.flow.id);
    const answers = state.flow.answers;
    const stepList = FLOWS.steps(flow.id, answers);
    const current = FLOWS.nextStep(flow.id, answers);

    let s = `<p class="result-count">${esc(flow.label)}</p><section class="flow" aria-label="${esc(flow.title)}">`;
    const chips = stepList.filter(x => x.answered).map(({ step }) => {
      const val = step.kind === "score"
        ? answers.us + "–" + answers.them
        : step.options.find(o => o.id === answers[step.id]).label;
      return `<button type="button" class="flow-edit" data-step="${esc(step.id)}"
                      aria-label="Change answer: ${esc(step.prompt)} (${esc(val)})">${esc(val)} <span class="flow-edit-x" aria-hidden="true">✎</span></button>`;
    });
    if (chips.length) s += `<div class="flow-chips">${chips.join("")}</div>`;

    if (current) {
      s += `<p class="flow-prompt">${esc(current.prompt)}</p>`;
      if (current.kind === "score") {
        const v = (n) => Number.isInteger(n) ? String(n) : "";
        s += `<form class="flow-score" autocomplete="off">
            <label class="flow-num"><span>Us</span>
              <input name="us" type="number" inputmode="numeric" min="0" max="199" value="${v(answers.us)}" aria-label="Our score"></label>
            <label class="flow-num"><span>Them</span>
              <input name="them" type="number" inputmode="numeric" min="0" max="199" value="${v(answers.them)}" aria-label="Their score"></label>
            <button type="submit" class="flow-go">Next</button>
          </form>`;
      } else {
        s += `<div class="flow-opts">` + current.options.map(o =>
          `<button type="button" class="quick flow-opt" data-step="${esc(current.id)}" data-val="${esc(o.id)}">${esc(o.label)}</button>`
        ).join("") + `</div>`;
      }
    } else {
      s += flowResultHTML(FLOWS.resolve(flow.id, answers));
    }
    s += `</section><button type="button" class="back-home">← All topics</button>`;
    $results.innerHTML = s;
    syncUrl();
    if (current && current.kind === "score") {
      const first = $results.querySelector('input[name="us"]');
      if (first && !Number.isInteger(answers.us)) first.focus();
    }
  }
  function flowResultHTML(res) {
    const st = res.status;
    let s = `<div class="flow-result">
      <div class="flow-status">
        <p class="flow-score-line">${esc(st.score)}</p>
        <p class="flow-regime">${esc(st.regime)}</p>
        ${st.detail ? `<p class="flow-detail">${esc(st.detail)}</p>` : ""}
      </div>`;
    res.tables.forEach(t => {
      s += `<div class="flow-table"><p class="flow-table-title">${esc(t.title)}</p>`;
      t.rows.forEach(r => {
        // r.after is the SCORING side's lead; show it from our side of the field
        const ours = t.who === "us" ? r.after : -r.after;
        const val = ours > 0 ? "up " + ours : ours < 0 ? "down " + (-ours) : "tied";
        const scorerLeads = (t.who === "us" && res.lead >= 0) || (t.who === "them" && res.lead < 0);
        let tag = "";
        if (scorerLeads) {
          tag = r.ok ? `<b class="flow-ok">OK</b>` : `<b class="flow-over">Over ${r.flag === "over38" ? "38" : "32"}</b>`;
        } else if (r.leavesProtocol) {
          tag = `<b class="flow-ok">Under 25</b>`;
        }
        s += `<div class="flow-stat">
            <span class="flow-stat-label">${esc(r.label)} <span class="flow-pts">+${r.pts}</span></span>
            <span class="flow-leader" aria-hidden="true"></span>
            <span class="flow-stat-val">${esc(val)}${tag}</span>
          </div>`;
      });
      s += `</div>`;
    });
    res.callouts.forEach(c => {
      const eyebrow = c.tone === "stop" ? "Stop" : c.tone === "go" ? "Option" : "Note";
      s += `<article class="flow-call tone-${esc(c.tone)}">
          <p class="flow-eyebrow">${eyebrow}</p>
          <p class="flow-call-head">${esc(c.heading)}</p>
          <p class="flow-call-text">${esc(c.text)}</p>
          ${c.rule ? `
          <button type="button" class="flow-rule" aria-expanded="false">${esc(c.cite)} <span aria-hidden="true">▾</span></button>
          <div class="flow-rule-card" hidden>
            <div class="fulltext"><div class="ft-title">Official rule — ${esc(c.cite)} · ${esc(c.rule.title)}</div>${esc(c.rule.text)}</div>
            <button type="button" class="flow-open-rule" data-docid="rule:${esc(c.ruleId)}">Open this rule ›</button>
          </div>` : ""}
        </article>`;
    });
    s += `<button type="button" class="flow-share" data-title="${esc("Score check " + st.score)}">Share this check</button></div>`;
    return s;
  }

  /* Share the deep link to one rule/situation — free, no third-party service:
     the native OS share sheet where available, otherwise copy-to-clipboard. */
  function shareDoc(docId, title) {
    shareLink(shareUrlFor(docId), title || "GEJFA Rule");
  }
  function shareLink(url, title) {
    if (navigator.share) {
      navigator.share({ title, text: title, url }).catch(() => {
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
    // ---- guided flow controls (checked before the generic .quick/.card handlers) ----
    const flowTile = e.target.closest(".quick-flow");
    if (flowTile) { openFlow(flowTile.dataset.flowid, {}); return; }
    const launch = e.target.closest(".flow-launch");
    if (launch) { openFlow("score", { us: +launch.dataset.us, them: +launch.dataset.them }); return; }
    const opt = e.target.closest(".flow-opt");
    if (opt) { const patch = {}; patch[opt.dataset.step] = opt.dataset.val; setFlowAnswer(patch); return; }
    const edit = e.target.closest(".flow-edit");
    if (edit) { clearFlowStep(edit.dataset.step); return; }
    const ruleBtn = e.target.closest(".flow-rule");
    if (ruleBtn) {
      const card = ruleBtn.nextElementSibling;
      if (card) { card.hidden = !card.hidden; ruleBtn.setAttribute("aria-expanded", String(!card.hidden)); }
      return;
    }
    const openRule = e.target.closest(".flow-open-rule");
    if (openRule) { openDoc(openRule.dataset.docid, "From score check"); return; }
    const flowShare = e.target.closest(".flow-share");
    if (flowShare) { shareLink(location.href, flowShare.dataset.title || "GEJFA score check"); return; }
    if (e.target.closest(".flow-score")) return; // the score form handles itself (submit)
    const quick = e.target.closest(".quick, .recent");
    if (quick) { openDoc(quick.dataset.docid, quick.textContent); return; }
    if (e.target.closest(".back-home")) { state.openDoc = null; syncUrl(); render(); return; }
    if (e.target.closest(".adv")) return; // Advanced disclosure handles itself
    const card = e.target.closest(".card");
    if (card) toggleCard(card);
  });
  $results.addEventListener("submit", (e) => {
    const form = e.target.closest(".flow-score");
    if (!form) return;
    e.preventDefault();
    const us = parseInt(form.elements.us.value, 10);
    const them = parseInt(form.elements.them.value, 10);
    if (!Number.isInteger(us) || !Number.isInteger(them) || us < 0 || them < 0) {
      infoToast("Enter both scores");
      return;
    }
    setFlowAnswer({ us, them });
  });
  $results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target.closest(".adv") || e.target.closest(".share-btn")) return; // let the native button/details handle itself
    if (e.target.closest(".flow")) return; // flow buttons/inputs are native controls
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); toggleCard(card); }
  });

  if (!openedFromLink) render();

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

  if (SHOT_MODE) {
    // screenshot mode: no install UI
  } else if (!isStandalone && installState() === null) {
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
    if (SHOT_MODE) return { remove() {} }; // screenshot mode: keep the frame clean
    const t = document.createElement("div");
    t.className = "toast-info";
    t.setAttribute("role", "status");
    t.textContent = text;
    // Place it just under the sticky search bar, whatever height the bar has
    // at this width (the Topic/home row wraps beneath the input on phones).
    const bar = document.querySelector(".searchwrap");
    if (bar) t.style.setProperty("--toast-top", (bar.offsetHeight + 6) + "px");
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 3200);
    return t;
  }

  /* Actionable status message — clickable, stays until acted on. Used only
     for "an update is ready" (a decision the coach should make on their own
     time, not something to auto-dismiss like infoToast). */
  function actionToast(text, onClick) {
    if (SHOT_MODE) return null;
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

      // ---- Update on every open ----
      // register() already checks for a new sw.js on a fresh page load, but a
      // home-screen PWA is usually *resumed* from the background, not reloaded.
      // So re-check whenever the app comes back into view, regains focus, or
      // gets back online — throttled so a quick tab-flip doesn't spam the network.
      const CHECK_THROTTLE_MS = 60 * 1000;
      let lastCheck = 0;
      function checkForUpdate() {
        const now = Date.now();
        if (now - lastCheck < CHECK_THROTTLE_MS) return;
        lastCheck = now;
        reg.update().catch(() => {});
      }
      checkForUpdate();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("focus", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      // Belt-and-braces for a session left open for days: check once a day anyway.
      setInterval(() => { lastCheck = 0; checkForUpdate(); }, 24 * 60 * 60 * 1000);

      // ---- Background sync every 24 h (Periodic Background Sync) ----
      // Chrome/Edge, installed PWA only; the browser also requires the site to
      // have some engagement. sw.js handles the "periodicsync" event: re-fetch
      // sw.js (picks up a bumped CACHE_VERSION) and refresh every cached asset,
      // so the rulebook is current even when the app hasn't been opened.
      // minInterval is a floor — the browser decides the actual cadence.
      if ("periodicSync" in reg && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "periodic-background-sync" })
          .then((status) => {
            if (status.state !== "granted") return;
            return reg.periodicSync.register("gejfa-rulebook-sync", {
              minInterval: 24 * 60 * 60 * 1000,
            });
          })
          .catch(() => {}); // unsupported / denied — the on-open check still covers us
      }
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
