/* GEJFA guided-flow resolver — pure logic, no DOM/browser APIs.
   Factory takes its dependencies so it runs identically in the browser,
   Node (tests), or a future native port (Capacitor / React Native).

   The only flow today is "score": given the score, the level, what is
   happening, and the quarter/time, it returns the deterministic "call" —
   which scoring plays keep the lead at or under 32 (Part II §10.b), the
   possession / clock rules in effect, and the consequences of a violation —
   each line tied to a rule id so the official text is one tap away.

   Thresholds are the rulebook's, literally: the protocol applies at 25 or
   more (>= 25); the cap is "more than 32" (> 32, so 32 exactly is legal);
   the automatic margin-of-victory suspension is "more than 38" (> 38). */

function createGejfaFlows({ flows, callouts, rules }) {
  const ruleById = {};
  (rules || []).forEach(r => { ruleById[r.id] = r; });
  const flowById = {};
  (flows || []).forEach(f => { flowById[f.id] = f; });

  const PROTOCOL_AT = 25; // Part II §10.b(2): "25 or more points"
  const CAP = 32;         // Part II §10.b: "more than 32 points"
  const AUTO_SUSPEND = 38; // Part II §10.c(3): "more than 38 points"

  // Scoring plays and their values (Part II §9: kick PAT = 2, run/pass PAT = 1).
  const OFFENSE_ROWS = [
    { id: "fg",      label: "Field goal",        pts: 3, elevenOnly: true }, // no FG in 8-player (§6.e)
    { id: "td",      label: "Touchdown",         pts: 6 },
    { id: "td-run",  label: "TD + run/pass PAT", pts: 7 },
    { id: "td-kick", label: "TD + kick PAT",     pts: 8 },
  ];
  const DEFENSE_ROWS = [
    { id: "safety",      label: "Safety",                pts: 2 },
    { id: "def-td",      label: "Defensive TD",          pts: 6 },
    { id: "def-td-run",  label: "Def. TD + run/pass PAT", pts: 7 },
    { id: "def-td-kick", label: "Def. TD + kick PAT",     pts: 8 },
  ];

  function list() { return flows; }
  function get(id) { return flowById[id] || null; }

  function stepApplies(step, answers) {
    if (!step.skipWhen) return true;
    return !Object.keys(step.skipWhen).some(k => step.skipWhen[k].includes(answers[k]));
  }
  function isAnswered(step, answers) {
    if (step.kind === "score") return Number.isInteger(answers.us) && Number.isInteger(answers.them);
    return (step.options || []).some(o => o.id === answers[step.id]);
  }
  /* Steps that apply given the answers so far, each tagged answered/unanswered. */
  function steps(flowId, answers) {
    const flow = flowById[flowId];
    if (!flow) return [];
    return flow.steps.filter(s => stepApplies(s, answers || {}))
      .map(s => ({ step: s, answered: isAnswered(s, answers || {}) }));
  }
  function nextStep(flowId, answers) {
    const pending = steps(flowId, answers).find(s => !s.answered);
    return pending ? pending.step : null;
  }
  /* Drop answers that no longer belong (unknown option ids, skipped steps). */
  function cleanAnswers(flowId, answers) {
    const flow = flowById[flowId];
    const out = {};
    if (!flow) return out;
    flow.steps.forEach(s => {
      if (!stepApplies(s, answers)) return;
      if (s.kind === "score") {
        if (Number.isInteger(answers.us)) out.us = answers.us;
        if (Number.isInteger(answers.them)) out.them = answers.them;
      } else if (s.options.some(o => o.id === answers[s.id])) {
        out[s.id] = answers[s.id];
      }
    });
    return out;
  }

  function callout(id) {
    const c = callouts[id];
    if (!c) return null;
    const r = ruleById[c.ruleId];
    return { id, ruleId: c.ruleId, tone: c.tone, heading: c.heading, text: c.text,
             cite: r ? r.cite : "", rule: r || null };
  }

  /* One "if X scores" table. `leadFor` is the scoring side's current lead
     (negative when it trails). Each row: the lead after that score, and
     whether it stays within the cap. */
  function table(kind, who, title, leadFor, rookie) {
    const src = kind === "defense" ? DEFENSE_ROWS : OFFENSE_ROWS;
    const rows = src.filter(r => !(r.elevenOnly && rookie)).map(r => {
      const after = leadFor + r.pts;
      return {
        id: r.id, label: r.label, pts: r.pts, after,
        ok: after <= CAP,
        flag: after > AUTO_SUSPEND ? "over38" : after > CAP ? "over32" : null,
        // crossing into (or out of) the 25-point protocol with this score
        entersProtocol: leadFor < PROTOCOL_AT && after >= PROTOCOL_AT,
        leavesProtocol: leadFor <= -PROTOCOL_AT && after > -PROTOCOL_AT,
      };
    });
    return { kind, who, title, rows };
  }

  function resolveScore(a) {
    const us = a.us, them = a.them;
    const lead = us - them;
    const abs = Math.abs(lead);
    const rookie = a.lvl === "rookie";
    const sit = a.sit, time = a.time;
    const isQ4 = time === "q4" || time === "q4-under4";
    const leading = lead > 0, trailing = lead < 0;
    const protocol = abs >= PROTOCOL_AT;
    const over32 = lead > CAP, over38 = lead > AUTO_SUSPEND;
    const theyOver32 = -lead > CAP, theyOver38 = -lead > AUTO_SUSPEND;

    const regime = trailing ? (protocol ? "behind25" : "normal")
                 : over32 ? "over32" : protocol ? "protocol" : "normal";
    const headroom = lead >= 0 ? CAP - lead : null;        // points we can still add
    const toProtocol = lead >= 0 && lead < PROTOCOL_AT ? PROTOCOL_AT - lead : null;

    // ---- status line ----
    const scoreLabel = lead > 0 ? "Up " + lead : lead < 0 ? "Down " + abs : "Tied";
    let regimeLabel, detail;
    if (regime === "over32") {
      regimeLabel = "Lead is more than 32";
      detail = over38 ? "The margin is also more than 38." : "";
    } else if (regime === "protocol") {
      regimeLabel = "25-point protocol in effect";
      detail = headroom > 0
        ? "Up to " + headroom + " more point" + (headroom === 1 ? "" : "s") + " keeps the lead at or under 32."
        : "At 32 exactly. Any more points exceeds the cap.";
    } else if (regime === "behind25") {
      regimeLabel = "Down 25+ — score management in effect";
      detail = "";
    } else if (lead >= 0 && sit !== "final") {
      regimeLabel = "Score management not in effect";
      detail = toProtocol + " more point" + (toProtocol === 1 ? "" : "s") + " reaches 25 (protocol starts); " +
               headroom + " more stays at or under 32.";
    } else {
      regimeLabel = sit === "final" ? "Final" : "Score management not in effect";
      detail = "";
    }
    if (sit === "final") {
      regimeLabel = lead > 0 ? (over32 ? "Won by more than 32" : "Final margin within 32")
                  : lead < 0 ? (theyOver32 ? "Lost by more than 32" : "Final")
                  : "Final — tied";
      detail = "";
    }

    // ---- scoring tables ----
    const tables = [];
    if (sit !== "final") {
      if (sit === "ball-them") {
        if (lead >= 0) tables.push(table("defense", "us", "If our defense scores", lead, rookie));
        else tables.push(table("offense", "them", "If they score", -lead, rookie));
      } else {
        tables.push(table("offense", "us", "If we score", lead, rookie));
      }
    }
    const rowsAll = tables.length ? tables[0].rows : [];
    const anyEntersProtocol = rowsAll.some(r => r.entersProtocol);

    // ---- callouts ----
    const out = [];
    const seen = new Set();
    const add = (id) => { if (seen.has(id)) return; const c = callout(id); if (c) { seen.add(id); out.push(c); } };
    const spotsForLeader = () => { add("lead-back-20"); if (rookie) add("rookie-spots"); };
    const spotsForTrailer = () => { add("trail-start-50"); if (rookie) add("rookie-spots"); };

    if (sit === "final") {
      if (over32 || theyOver32) {
        add("over-32-offense"); add("over-32-defense");
        if (over38 || theyOver38) add("over-38");
        add("suspension-contact");
      }
      add("standings");
    } else if (protocol) {
      if (leading && over32) {
        add("over-32-offense"); add("over-32-defense");
        if (over38) add("over-38");
        add("suspension-contact");
      } else if (leading) {
        add("cap-intent");
      }
      switch (sit) {
        case "ball-us":
          if (leading) { add("inside-20-flip"); add("inside-20-penalty"); spotsForLeader(); }
          else spotsForTrailer();
          break;
        case "ball-them":
          if (leading) spotsForTrailer();
          else { add("inside-20-flip"); spotsForLeader(); }
          break;
        case "we-scored":
          if (leading) { add("after-score-50"); if (rookie) add("rookie-spots"); }
          else { add("elect-possession"); spotsForTrailer(); if (time === "q4-under4") add("onside-alt-25"); }
          break;
        case "they-scored":
          if (leading) spotsForLeader();
          else { add("after-score-50"); add("elect-possession"); if (rookie) add("rookie-spots"); }
          break;
        case "half":
          add("elect-possession"); spotsForTrailer();
          break;
      }
      add("timeout-25");
      if (sit !== "half") add(isQ4 ? "running-clock" : "running-clock-agree");
    } else {
      switch (sit) {
        case "ball-us":
          if (leading && anyEntersProtocol) add("after-score-50");
          add("pat-values");
          break;
        case "ball-them":
          add("safety-50");
          if (anyEntersProtocol) add("after-score-50");
          break;
        case "we-scored":
          if (trailing && time === "q4-under4") add("onside-alt");
          add("no-kickoff-35");
          if (rowsAll.some(r => r.leavesProtocol) || trailing) add("below-25-resume");
          break;
        case "they-scored":
          add("no-kickoff-35");
          add("below-25-resume");
          break;
        case "half":
          break;
      }
    }
    // 8-player has no field goal, so the FG row is absent — say why.
    if (rookie && tables.some(t => t.kind === "offense")) add("no-fg-rookie");
    // A defensive TD that fits under the cap while its PAT would not: the book
    // does not classify that PAT, so say so rather than guess.
    const defTable = tables.find(t => t.kind === "defense");
    if (defTable) {
      const td = defTable.rows.find(r => r.id === "def-td");
      const pats = defTable.rows.filter(r => r.id === "def-td-run" || r.id === "def-td-kick");
      if (td && td.ok && pats.some(r => !r.ok)) add("pat-after-def-td");
    }
    add("nfhs");

    return {
      flowId: "score",
      answers: { us, them, lvl: a.lvl, sit, time: time || null },
      lead, abs, regime, headroom, toProtocol, rookie,
      status: { score: scoreLabel, regime: regimeLabel, detail },
      tables, callouts: out,
    };
  }

  function resolve(flowId, answers) {
    if (flowId !== "score") return null;
    if (nextStep(flowId, answers)) return null; // incomplete
    return resolveScore(answers);
  }

  /* Recognise a score typed into the search box so the UI can offer the flow.
     "28-0", "28 – 0", "28 to 0" → both scores; "up 28", "ahead by 28" → lead
     only (them = 0); "down 12", "behind by 12" → deficit only. A lone number,
     "4th and 10", or "12 plays" never match. */
  function parseScoreQuery(text) {
    const q = String(text || "").toLowerCase().trim();
    if (!q) return null;
    let m = q.match(/(?:^|[^\d])(\d{1,3})\s*(?:-|–|—|to)\s*(\d{1,3})(?!\d)/);
    if (m) return { us: parseInt(m[1], 10), them: parseInt(m[2], 10) };
    m = q.match(/\b(?:up|ahead|winning|leading|lead)\b(?:\s+by)?\s+(\d{1,3})\b/);
    if (m) return { us: parseInt(m[1], 10), them: 0 };
    m = q.match(/\b(?:down|behind|losing|trailing)\b(?:\s+by)?\s+(\d{1,3})\b/);
    if (m) return { us: 0, them: parseInt(m[1], 10) };
    return null;
  }

  return { list, get, steps, nextStep, cleanAnswers, resolve, parseScoreQuery };
}

// Escape hatch for Node / React Native / bundlers
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createGejfaFlows };
}
