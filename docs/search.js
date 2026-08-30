/* GEJFA search engine — pure logic, no DOM/browser APIs.
   Factory takes its dependencies so it runs identically in the browser,
   Node (tests), or a future native port (Capacitor / React Native).

   Ranking strategy for sideline speed:
   1) intent patterns ("up 30", "4th and 10") expand the query toward the right rule
   2) synonym expansion (coach-speak -> rulebook terms)
   3) precision pass: documents matching ALL query terms rank first
   4) recall pass: broader any-term matches fill in behind them            */

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
      boost: { question: 5, title: 4, keywords: 3.5, answer: 2, text: 0.6 },
      boostDocument: (docId) => (docId.startsWith("sit:") ? 1.4 : 1),
    },
  });
  mini.addAll(docs);
  const docByDocId = {};
  docs.forEach(d => { docByDocId[d.docId] = d; });

  /* Situation-intent patterns: things a coach types in the heat of the moment
     that keyword matching alone won't route correctly. */
  const INTENTS = [
    { re: /\b(up|ahead|lead\w*|winning|beat\w*|won)\b[^a-z0-9]*(by\s*)?(2[5-9]|3[0-9]|4[0-9]|5[0-9])\b/, add: "score management 32 point rule margin suspension" },
    { re: /\b(2[5-9]|3[0-9]|4[0-9]|5[0-9])\s*(points?|pts?)\b/, add: "score management 32 point rule 25 points" },
    { re: /\b(down|losing|behind|trail\w*)\b[^a-z0-9]*(by\s*)?\d+/, add: "score management take possession 50 trailing" },
    { re: /\b(4th|fourth)\s*(and|&)\s*(10|ten)\b/, add: "onside kick alternative 25 yard line" },
    { re: /\b(12|twelve)\s*plays?\b/, add: "twelve plays minimum playing time" },
    { re: /\b(4|four)\s*plays?\b/, add: "substitution four consecutive plays empty bench" },
    { re: /\bhow\s+many\s+(coaches|officials|refs|players|plays)\b/, add: "number count" },
    { re: /\b(ot|overtime|tied?)\b.*\b(game|playoff|champ\w*)\b|\b(game|playoff)\b.*\b(tied?|overtime|ot)\b/, add: "tiebreaker overtime playoff" },
    { re: /\b(no|not enough|short)\b.*\bplayers\b/, add: "forfeit field team notice minimum roster" },
    { re: /\bkid\b|\bson\b|\bplayer\b.*\b(hurt|injur\w*)\b/, add: "injured substitution helmet" },
  ];

  function expandQuery(query) {
    const lower = query.toLowerCase();
    const tokens = lower.split(/[^a-z0-9/']+/).filter(Boolean);
    const extra = [];
    tokens.forEach(t => {
      const syn = synonyms[t];
      if (syn) extra.push(...syn);
    });
    INTENTS.forEach(it => { if (it.re.test(lower)) extra.push(it.add); });
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

    /* Standalone numbers in a coach's query are almost always situational
       ("up 30", "down by 26") — the intent patterns translate them. Left in,
       they collide with unrelated numeric rule specs (ball sizes, rosters). */
    const stripped = q.replace(/(^|\s)\d+(?=\s|$)/g, " ").trim();
    const base = stripped || q;
    const expanded = expandQuery(q).replace(q, base);

    // precision first: docs containing every remaining term of the raw query
    const strict = base.split(/\s+/).length > 1
      ? mini.search(base, { combineWith: "AND" })
      : [];
    // recall: expanded any-term match
    const broad = mini.search(expanded, { combineWith: "OR" });

    const seen = new Set();
    const out = [];
    function take(list, boost) {
      for (const r of list) {
        if (seen.has(r.id)) continue;
        const doc = docByDocId[r.id];
        if (!doc || !matchesFilters(doc, filters)) continue;
        seen.add(r.id);
        out.push({ ...doc, score: r.score * boost });
        if (out.length >= 30) return true;
      }
      return false;
    }
    if (!take(strict, 10)) take(broad, 1);
    return out;
  }

  /* No query: list situations first, then rules, filtered. */
  function browse(filters = {}) {
    const sits = docs.filter(d => d.type === "situation" && matchesFilters(d, filters));
    const rls = docs.filter(d => d.type === "rule" && matchesFilters(d, filters));
    return sits.concat(rls);
  }

  function byDocId(id) { return docByDocId[id] || null; }

  return { search, browse, byDocId, ruleById, docCount: docs.length };
}

// Escape hatch for Node / React Native / bundlers
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createGejfaSearch };
}
