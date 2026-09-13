import type { IFlow, IFlowCallout } from "../types.js";

/* GEJFA guided flows — tap-through follow-up questions that resolve a live game
   situation to "the call" with no AI. Pure data module: no DOM/browser APIs.

   Every callout cites a rule id from rules.js, and its wording is the rulebook's
   own language (Part II §1, §6, §8, §9, §10 — near-verbatim, meaning-identical
   condensation only) so nothing here can drift from the audited baseline. The
   arithmetic (which scores stay at or under 32) lives in flows.js. */

export const GEJFA_FLOWS: IFlow[] = [
  {
    id: "score",
    label: "Score check",
    title: "Score check — what's legal right now?",
    steps: [
      { id: "score", kind: "score", prompt: "What's the score?" },
      { id: "lvl", kind: "choice", prompt: "Which level?",
        options: [
          { id: "rookie",  label: "Rookie (8-player)" },
          { id: "cub",     label: "Cub" },
          { id: "soph",    label: "Sophomore" },
          { id: "jv",      label: "Junior Varsity" },
          { id: "varsity", label: "Varsity" },
        ] },
      { id: "sit", kind: "choice", prompt: "What's happening?",
        options: [
          { id: "ball-us",     label: "We have the ball" },
          { id: "ball-them",   label: "They have the ball" },
          { id: "we-scored",   label: "We just scored" },
          { id: "they-scored", label: "They just scored" },
          { id: "half",        label: "Start of 2nd half" },
          { id: "final",       label: "Game is over" },
        ] },
      { id: "time", kind: "choice", prompt: "Where are we in the game?",
        options: [
          { id: "q4-under4", label: "4th qtr, under 4:00" },
          { id: "q4",        label: "4th qtr, over 4:00" },
          { id: "early",     label: "1st–3rd quarter" },
        ],
        skipWhen: { sit: ["final", "half"] } },
    ],
  },
];

/* Callouts are team-neutral ("the leading team" / "the trailing team"), exactly
   as the rulebook phrases them — the flow's status line says which one you are.
   tone: "stop" = a restriction on you right now, "go" = an option you hold,
   "note" = context. */
export const GEJFA_FLOW_CALLOUTS: Record<string, IFlowCallout> = {
  "cap-intent": { ruleId: "II-10-b", tone: "stop", heading: "The 32-point rule",
    text: "It is the intent and spirit of the GEJFA Council that no team shall defeat, nor at any point in the game lead, an opponent by more than 32 points." },
  "timeout-25": { ruleId: "II-10-b", tone: "go", heading: "League timeout available",
    text: "Any time a team is ahead by 25 or more points, either coach may call a league timeout in order to discuss further game protocol." },
  "after-score-50": { ruleId: "II-10-b", tone: "note", heading: "Trailing team takes the ball at the 50",
    text: "When the score differential is 25 or more points: after a score that creates this score differential, the trailing team will take possession and start their offensive series at the 50 yard line; there will be no kick-off." },
  "trail-start-50": { ruleId: "II-10-b", tone: "note", heading: "Trailing team starts at the 50",
    text: "When the trailing team takes possession of the ball, it starts its offensive series at the 50 yard line, or at the point of possession if inside the other team's 50." },
  "lead-back-20": { ruleId: "II-10-b", tone: "stop", heading: "Leading team starts at its own 20",
    text: "When the leading team takes possession anywhere outside its own 20 yard line, the ball is moved back to that team's 20 yard line to start the offensive series." },
  "inside-20-flip": { ruleId: "II-10-b2d", tone: "stop", heading: "Ball flips at the trailing team's 20",
    text: "At the end of any play, if the team in possession is ahead by 25 or more points and the line of scrimmage for the next play will be at or inside the 20-yard line of the trailing team, possession is immediately given to the trailing team on the 50-yard line." },
  "inside-20-penalty": { ruleId: "II-10-b2d", tone: "note", heading: "Penalties into the 20 may be declined",
    text: "The ball may not be advanced to or inside the 20 yard line by any penalty (including those that are mandatory) without first giving the leading team a choice to decline." },
  "rookie-spots": { ruleId: "II-6-hi", tone: "note", heading: "8-player spots: midfield and own 15",
    text: "8-player (Rookie): the score management rules apply; the trailing team starts offense from midfield, and the leading team starts offense from its own 15." },
  "running-clock": { ruleId: "II-10-b2e", tone: "note", heading: "Running clock",
    text: "At the beginning of the 4th quarter, or at such time in the 4th quarter that a 25 point or more score differential exists, the game clock goes to a running clock and is stopped only for injuries or time outs. Once a running clock, always a running clock." },
  "running-clock-agree": { ruleId: "II-10-b2e", tone: "note", heading: "Running clock by agreement",
    text: "The automatic running clock begins in the 4th quarter. The game clock can go to a running clock at any time during the game if both coaches agree." },
  "below-25-resume": { ruleId: "II-10-b2e", tone: "note", heading: "If the gap drops below 25",
    text: "If the score differential drops below 25 points, regular play resumes — except that once a running clock, always a running clock." },
  "over-32-offense": { ruleId: "II-10-c", tone: "stop", heading: "Exceeded 32 offensively",
    text: "If a team exceeds the 32 point margin offensively, the Head Coach is automatically suspended by his/her Club for the next game. No appearance before the Grievance Committee is required." },
  "over-32-defense": { ruleId: "II-10-c", tone: "stop", heading: "Exceeded 32 on a defensive score",
    text: "If a team exceeds the 32 point margin and the last score was defensive, the Head Coach must meet with the Grievance Committee before coaching the next game, unless excused by the Grievance Committee because it is unable to meet in a timely manner." },
  "over-38": { ruleId: "II-10-c", tone: "stop", heading: "Margin of victory more than 38",
    text: "If a team's margin of victory is more than 38 points by any situation, the Head Coach is automatically suspended for the next game. No appearance before the Grievance Committee is necessary." },
  "suspension-contact": { ruleId: "II-10-c", tone: "note", heading: "While suspended",
    text: "A coach on suspension for violation of the 32 point rule cannot have communication/contact of any type with the team on game day, until after the game is completed. A second violation of the 32 point rule, or a violation of the game day contact rule, results in suspension for the remainder of the season; these suspensions may not be appealed." },
  "standings": { ruleId: "II-10-d", tone: "note", heading: "Margin never affects standings",
    text: "Point differential in games never has any effect on the standings or playoff seeding." },
  "elect-possession": { ruleId: "II-10-a", tone: "go", heading: "Trailing team may take the ball",
    text: "Any team that is behind by twenty-five (25) points or more — even after just scoring a touchdown, field goal, or point after touchdown, or at the start of the second half — may elect to take possession of the ball." },
  "onside-alt": { ruleId: "II-8-b", tone: "go", heading: "Onside alternative: own 25, 4th and 10",
    text: "If the trailing team scores a touchdown with less than four (4) minutes to go in the game and is still trailing, it may elect to take the ball on its own 25 yard line, fourth and 10 (in lieu of what might be an onside kick). This is a timed down (the substitution rule applies), all penalties are enforced as normal, and once a team declares this option it cannot change its mind." },
  "onside-alt-25": { ruleId: "II-8-b", tone: "go", heading: "Still down 25+: ball at the 50",
    text: "The score management rules still apply: if the trailing team scores and is still down by 25 or more points, that team gets the ball on the 50, first and 10." },
  "no-kickoff-35": { ruleId: "II-8", tone: "note", heading: "No kickoff — ball at the 35",
    text: "There are no kickoffs at any playing level. In place of a kickoff, the ball is given to what would otherwise be the receiving team at its own 35 yard line, first and 10." },
  "safety-50": { ruleId: "II-8", tone: "note", heading: "After a safety",
    text: "In the case of a safety, the opponent takes the ball on offense at the 50 in lieu of receiving a kick." },
  "pat-values": { ruleId: "II-9", tone: "note", heading: "PAT values",
    text: "At all levels: a point after touchdown conversion kick will be worth two (2) points. A run or pass PAT will be worth one (1) point." },
  "no-fg-rookie": { ruleId: "II-6-ef", tone: "stop", heading: "8-player: no field goals",
    text: "8-player (Rookie): there is no field goal (FG) and no kickoff play. There are still punts (no return), but still subject to the substitution rule." },
  "pat-after-def-td": { ruleId: "II-1", tone: "note", heading: "PAT after a defensive touchdown",
    text: "The GEJFA rulebook does not say whether a PAT following a defensive touchdown counts as an offensive or a defensive score. Where the GEJFA book is silent, NFHS rules apply." },
  "nfhs": { ruleId: "II-1", tone: "note", heading: "Everything else",
    text: "Where the GEJFA rulebook is silent, NFHS high school rules apply." },
};

