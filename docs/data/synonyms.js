/* Coach-speak → rulebook-term synonym expansion.
   Keys are single lowercase query tokens; values are extra terms appended to the search.
   Pure data module: no DOM/browser APIs. */

const GEJFA_SYNONYMS = {
  // score management
  "mercy":      ["score management", "32 point rule", "25 points"],
  "blowout":    ["score management", "32 point rule", "25 points"],
  "slaughter":  ["score management", "32 point rule"],
  "skunk":      ["score management", "32 point rule"],
  "lead":       ["score management", "25 points", "32 point"],

  // overtime / ties
  "overtime":   ["tiebreaker", "tie breaker", "playoff tie"],
  "ot":         ["tiebreaker", "overtime", "playoff tie"],
  "shootout":   ["tiebreaker", "seeding"],
  "kansas":     ["tiebreaker", "overtime"],

  // kickoffs
  "kickoff":    ["no kickoffs", "35 yard line", "onside"],
  "kick":       ["kickoff", "pat", "punt", "conversion"],
  "onside":     ["onside kick alternative", "4th and 10", "25 yard line"],
  "kickoffs":   ["no kickoffs", "35 yard line"],

  // PAT
  "pat":        ["point after touchdown", "extra point", "conversion"],
  "conversion": ["point after touchdown", "pat", "two point"],
  "xp":         ["extra point", "pat", "point after touchdown"],

  // weigh-in
  "weight":     ["weigh-in", "weigh in", "overweight", "allowance"],
  "weigh":      ["weigh-in", "weighmaster"],
  "scale":      ["weigh-in", "weighmaster", "zero"],
  "fat":        ["overweight", "weight allowance", "weigh-in"],
  "heavy":      ["overweight", "weight allowance", "weigh-in"],
  "striper":    ["overweight", "weigh-in"],

  // substitution
  "subs":       ["substitution", "empty bench", "four plays"],
  "sub":        ["substitution", "empty bench"],
  "platoon":    ["substitution", "empty bench"],
  "snaps":      ["plays", "twelve plays", "playing time", "substitution"],
  "turnover":   ["change of possession", "substitution", "interception", "fumble"],
  "pick":       ["interception", "change of possession"],

  // discipline
  "ejected":    ["ejection", "disqualified", "suspension"],
  "ejection":   ["disqualified", "suspension", "appeal"],
  "dq":         ["disqualified", "ejection"],
  "tossed":     ["ejected", "disqualified"],
  "flagrant":   ["ejection", "disqualified"],
  "suspended":  ["suspension", "no contact", "grievance"],
  "targeting":  ["ejection", "disqualified"],

  // equipment
  "cast":       ["hard cast", "brace", "wrapped", "foam"],
  "cleats":     ["shoes", "metal", "detachable", "molded"],
  "spikes":     ["cleats", "metal", "shoes"],
  "mouthpiece": ["mouth guard", "mouthguard"],
  "mouthguard": ["mouth guard"],
  "ball":       ["football size", "game ball"],
  "helmet":     ["equipment", "weigh-in"],

  // game day
  "refs":       ["officials", "referees"],
  "ref":        ["official", "referee"],
  "headsets":   ["electronic communications", "radios", "cell phones"],
  "radios":     ["electronic communications", "two-way"],
  "walkie":     ["electronic communications", "radios", "two-way"],
  "film":       ["video", "scouting", "photography"],
  "video":      ["filming", "scouting", "photography", "camera"],
  "veo":        ["ai camera", "tripod camera", "video"],
  "hudl":       ["video", "film", "scouting"],
  "lightning":  ["interrupted game", "weather"],
  "rain":       ["interrupted game", "weather", "wet ball"],
  "storm":      ["interrupted game", "weather"],
  "parents":    ["spectators", "field access", "sideline"],
  "fans":       ["spectators", "field access"],
  "chains":     ["down box", "chain crew", "home team"],
  "huddle":     ["coach on field", "no huddle"],

  // rosters / eligibility
  "roster":     ["squad limit", "game roster", "exchange"],
  "quit":       ["terminated", "eligibility"],
  "moved":      ["transfer", "boundaries"],
  "younger":    ["level assignment", "age weight"],
  "older":      ["level assignment", "age weight", "ninth grader"],
  "bigger":     ["age points", "level assignment", "play up"],
  "smaller":    ["age points", "level assignment", "play up"],

  // practice
  "scrimmage":  ["jamboree", "practice", "collision contact"],
  "conditioning": ["practice", "two hours"],
  "hitting":    ["collision contact", "contact progression"],
  "contact":    ["collision contact", "practice"],

  // playoffs
  "seed":       ["seeding", "tiebreaker", "standings"],
  "seeding":    ["head to head", "coin toss", "standings"],
  "bracket":    ["gold tournament", "silver tournament", "playoffs"],
  "champs":     ["championship", "playoffs"],
  "postseason": ["playoffs", "gold", "silver", "consolation"],
};

// Escape hatch for Node / React Native / bundlers
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GEJFA_SYNONYMS };
}
