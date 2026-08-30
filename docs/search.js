/* GEJFA search engine — pure logic, no DOM/browser APIs.
   Factory takes its dependencies so it runs identically in the browser,
   Node (tests), or a future native port (Capacitor / React Native).

   Usage (browser):  const engine = createGejfaSearch({ MiniSearch, rules, situations, synonyms });
   Usage (node):     const { createGejfaSearch } = require('./search');                              */

function createGejfaSearch({ MiniSearch, rules, situations, synonyms }) {
  const ruleById = {};
  rules.forEach(r => { ruleById[r.id] = r; });

  // Unified document list: situations rank above raw rules for the same hit.
  const docs = [];
  rules.forEach(r => docs.push({
    docId: "rule:" + r.id, type: "rule",
    title: r.title, question: "", answer: r.answer, text: r.text,
    keywords: (r.keywords || []).join(" "),
    category: r.category, levels: r.levels, rule: r,
  }));
  situations.forEach(s => {
    const r = ruleById[s.ruleId];
    docs.push({
      docId: "sit:" + s.id, type: "situation",
      title: r ? r.title : "", question: s.question, answer: s.answer,
      text: r ? r.text : "",
      keywords: (s.keywords || []).concat(r ? r.keywords || [] : []).join(" "),
      category: r ? r.category : "game-day",
      levels: r ? r.levels : ["all"],
      rule: r, situation: s,
    });
  });

  const mini = new MiniSearch({
    idField: "docId",
    fields: ["question", "title", "keywords", "answer", "text"],
    storeFields: ["docId"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      combineWith: "OR",
      boost: { question: 5, title: 4, keywords: 3.5, answer: 2, text: 0.6 },
      boostDocument: (docId) => (docId.startsWith("sit:") ? 1.4 : 1),
    },
  });
  mini.addAll(docs);
  const docByDocId = {};
  docs.forEach(d => { docByDocId[d.docId] = d; });

  function expandQuery(query) {
    const tokens = query.toLowerCase().split(/[^a-z0-9/']+/).filter(Boolean);
    const extra = [];
    tokens.forEach(t => {
      const syn = synonyms[t];
      if (syn) extra.push(...syn);
    });
    return extra.length ? query + " " + extra.join(" ") : query;
  }

  function matchesFilters(doc, { level, category }) {
    if (category && doc.category !== category) return false;
    if (level && !(doc.levels.includes("all") || doc.levels.includes(level))) return false;
    return true;
  }

  /* Returns ranked docs: [{type, question?, answer, rule, situation?, score}] */
  function search(query, filters = {}) {
    const q = (query || "").trim();
    if (!q) return browse(filters);
    const results = mini.search(expandQuery(q));
    const out = [];
    for (const r of results) {
      const doc = docByDocId[r.id];
      if (!doc || !matchesFilters(doc, filters)) continue;
      out.push({ ...doc, score: r.score });
      if (out.length >= 30) break;
    }
    return out;
  }

  /* No query: list situations first, then rules, filtered. */
  function browse(filters = {}) {
    const sits = docs.filter(d => d.type === "situation" && matchesFilters(d, filters));
    const rls = docs.filter(d => d.type === "rule" && matchesFilters(d, filters));
    return sits.concat(rls);
  }

  return { search, browse, ruleById, docCount: docs.length };
}

// Escape hatch for Node / React Native / bundlers
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createGejfaSearch };
}
