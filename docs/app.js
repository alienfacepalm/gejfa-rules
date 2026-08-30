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

  const $q = document.getElementById("q");
  const $clear = document.getElementById("clearBtn");
  const $chips = document.getElementById("chips");
  const $results = document.getElementById("results");
  const $levelBtn = document.getElementById("levelBtn");
  const $levelSheet = document.getElementById("levelSheet");
  const $levelOptions = document.getElementById("levelOptions");

  const state = { query: "", category: null, level: null };

  // ---- category chips ----
  GEJFA_CATEGORIES.forEach(cat => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = cat.label;
    b.dataset.cat = cat.id;
    b.addEventListener("click", () => {
      state.category = state.category === cat.id ? null : cat.id;
      updateChips();
      render();
    });
    $chips.appendChild(b);
  });
  function updateChips() {
    $chips.querySelectorAll(".chip").forEach(c =>
      c.classList.toggle("active", c.dataset.cat === state.category));
  }

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
    debounce = setTimeout(render, 60);
  });
  $clear.addEventListener("click", () => {
    $q.value = ""; state.query = ""; $clear.hidden = true; $q.focus(); render();
  });
  $q.addEventListener("keydown", (e) => { if (e.key === "Enter") $q.blur(); });

  // ---- rendering ----
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function levelsLabel(levels) {
    if (!levels || levels.includes("all")) return "All levels";
    return levels.map(id => {
      const lv = GEJFA_LEVELS.find(l => l.id === id);
      return lv ? lv.label : id;
    }).join(" · ");
  }

  /* At a glance: title + clamped short answer. Opened: full answer,
     diagram (when the section has one), citation, and official rule text. */
  function cardHTML(doc, i) {
    const isSit = doc.type === "situation";
    const heading = isSit ? doc.situation.question : doc.title;
    const answer = isSit ? doc.situation.answer : doc.answer;
    const rule = doc.rule;
    const diagram = rule ? DIAGRAMS[rule.id] : null;
    return `
      <article class="card ${isSit ? "situation" : ""}" data-i="${i}" tabindex="0"
               role="button" aria-expanded="false">
        <p class="q">${esc(heading)}</p>
        <p class="a">${esc(answer)}</p>
        <div class="detail" hidden>
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

  function render() {
    const docs = engine.search(state.query, { level: state.level, category: state.category });

    if (!docs.length) {
      $results.innerHTML = `
        <div class="empty">
          <p><strong>No rule found for that.</strong></p>
          <p>Try fewer or different words (e.g. “weigh in”, “ejected”, “subs”, “overtime”) or browse a category above.</p>
          <p>If it isn't covered here or in the GEJFA book, NFHS high school rules apply.</p>
        </div>`;
      return;
    }

    const label = state.query.trim()
      ? `${docs.length} match${docs.length === 1 ? "" : "es"}`
      : (state.category ? `${docs.length} in category` : `Common situations`);
    $results.innerHTML =
      `<p class="result-count">${esc(label)}</p>` +
      docs.map((d, i) => cardHTML(d, i)).join("");
  }

  /* Focus mode: one topic open at a time; opening scrolls it under the search bar. */
  function toggleCard(card) {
    const isOpen = card.classList.contains("open");
    $results.querySelectorAll(".card.open").forEach(c => {
      c.classList.remove("open");
      c.setAttribute("aria-expanded", "false");
      const d = c.querySelector(".detail");
      if (d) d.hidden = true;
    });
    if (!isOpen) {
      card.classList.add("open");
      card.setAttribute("aria-expanded", "true");
      const d = card.querySelector(".detail");
      if (d) d.hidden = false;
      requestAnimationFrame(() => {
        card.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
  }

  $results.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) toggleCard(card);
  });
  $results.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card");
    if (card) { e.preventDefault(); toggleCard(card); }
  });

  render();

  // ---- PWA service worker ----
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => { /* offline install is best-effort */ });
  }
})();
