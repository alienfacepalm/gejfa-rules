import type { IRule, ICategory, ILevel } from "../types.js";

/* GEJFA 2025 Rules — structured data curated from "2025 GEJFA Rules Final" (adopted Aug 1, 2025).
   Pure data module: no DOM/browser APIs. Usable in browser (global), Node, or a future native port.
   Fields: id, cite, category, title, levels, answer (plain-English), text (rule language), keywords. */

export const GEJFA_CATEGORIES: ICategory[] = [
  { id: "weigh-in",     label: "Weigh-In" },
  { id: "substitution", label: "Substitution" },
  { id: "score-mgmt",   label: "Score Mgmt (32-pt)" },
  { id: "kickoffs-pat", label: "Kickoffs & PAT" },
  { id: "8-player",     label: "8-Player (Rookie)" },
  { id: "playoffs",     label: "Playoffs & Ties" },
  { id: "discipline",   label: "Ejections & Discipline" },
  { id: "equipment",    label: "Equipment" },
  { id: "game-day",     label: "Game Day" },
  { id: "protests",     label: "Protests" },
  { id: "practice",     label: "Practice" },
  { id: "eligibility",  label: "Eligibility & Rosters" },
];

export const GEJFA_LEVELS: ILevel[] = [
  { id: "rookie",  label: "Rookie" },
  { id: "cub",     label: "Cub" },
  { id: "soph",    label: "Sophomore" },
  { id: "jv",      label: "Junior Varsity" },
  { id: "varsity", label: "Varsity" },
];

export const GEJFA_RULES: IRule[] = [

  // ============ PART II — RULES FOR PLAY ============

  {
    id: "II-1", cite: "Part II §1", category: "game-day",
    title: "NFHS high school rules are the baseline",
    levels: ["all"],
    answer: "If the GEJFA rulebook doesn't change it, National Federation of High Schools (NFHS) rules apply.",
    text: "National Federation of State High School Association (NFHS) rules shall apply except as noted within this document.",
    keywords: ["nfhs", "high school rules", "default rules", "federation", "rule book baseline"]
  },

  // ---- Weigh-ins ----
  {
    id: "II-2-a", cite: "Part II §2.a", category: "weigh-in",
    title: "Who must weigh in, and arrival time",
    levels: ["all"],
    answer: "Everyone is at the field 1 hour before kickoff. All players weigh in EXCEPT players assigned by league age alone. Ninth graders with more than 67 age points must meet the age/weight formula, so they must weigh in.",
    text: "Teams and individual players shall be at the game site one (1) hour before their scheduled starting time. All players must weigh-in except: players assigned based on league age alone (see Age/Weight Chart) are not subject to weight restrictions and need not weigh-in. All ninth graders with more than 67 age points must meet the required Age/Weight formula, thus must weigh-in.",
    keywords: ["arrival time", "one hour", "who weighs in", "age only", "ninth grader", "9th grade", "67 points", "exempt"]
  },
  {
    id: "II-2-b", cite: "Part II §2.b", category: "weigh-in",
    title: "Over the weight limit at weigh-in",
    levels: ["all"],
    answer: "A player more than 0.9 lb (9/10ths of a pound) over his/her maximum weight allowance at weigh-in cannot play in the game.",
    text: "Any player who EXCEEDS his/her maximum weight allowance by more than nine tenths (9/10ths) of a pound at weigh-in will not be allowed to play in the game.",
    keywords: ["overweight", "over limit", "9/10", "0.9", "too heavy", "missed weight", "failed weigh in", "disqualified weight"]
  },
  {
    id: "II-2-cd", cite: "Part II §2.c–d", category: "weigh-in",
    title: "Weighmaster and weigh-in lineup",
    levels: ["all"],
    answer: "The home club's field/stadium manager runs the weigh-in as 'weighmaster' (or designates a competent alternate). One representative from each team witnesses. Teams line up in roster order, top to bottom (oldest to youngest).",
    text: "The 'weighmaster' generally will be the stadium or field manager for the Home Club... The 'weighmaster' plus one representative from each team will be present to witness the weigh-in procedures. Each team representative shall also make sure that their team is lined up in the same order as the players are listed on the roster, reading from top to bottom (oldest to youngest).",
    keywords: ["weighmaster", "who runs weigh in", "lineup order", "roster order", "witness", "field manager"]
  },
  {
    id: "II-2-ef", cite: "Part II §2.e–f", category: "weigh-in",
    title: "Visiting team weighs first; scale check",
    levels: ["all"],
    answer: "The visiting team weighs in first. Either team's representative may ask the weighmaster to zero (balance) the scale to check accuracy. During weigh-in, reps observe only and may not interfere.",
    text: "The visiting team shall weigh-in first and the visiting team representative shall have an option to request the 'weighmaster' balance out (zero) the scale to check for accuracy. The home team representative also shall have this option. Once the weigh-in commences, each team representative shall be the only observer and shall have no authority to interfere with the 'weighmaster.' The team representatives shall answer all questions asked of them by the 'weighmaster' that are pertinent to the team.",
    keywords: ["visitor first", "scale accuracy", "zero scale", "balance scale", "check scale", "order of weigh in"]
  },
  {
    id: "II-2-g", cite: "Part II §2.g", category: "weigh-in",
    title: "Two roster copies at weigh-in",
    levels: ["all"],
    answer: "Each team gives the weighmaster two copies of the official game roster (one for the league, one for the opposing coach), with correct jersey numbers and notes on injured/disciplined players.",
    text: "Each team representative shall provide the 'weighmaster' with two (2) copies of their official team game roster. One copy shall remain with the 'weighmaster' so it can be turned into the League (when requested) and the second copy shall be given to the opposing coach. The roster shall contain the correct jersey number for each player and specific game notes such as players injured or being disciplined.",
    keywords: ["roster copies", "two copies", "exchange roster", "jersey numbers on roster", "game notes"]
  },
  {
    id: "II-2-h", cite: "Part II §2.h", category: "weigh-in",
    title: "Weigh-in start time window",
    levels: ["all"],
    answer: "Weigh-ins may start 1 hour before game time and no later than 50 minutes before — ideally visitors at 55 minutes out, home at 50. If the visitors aren't ready when called, the home team may opt to weigh first if they are ready.",
    text: "All weigh-ins may commence one hour prior to scheduled game time but in no case shall start later than 50 minutes prior to game time, ideally with the visiting team starting at 55 minutes to game time and the home team starting at 50 minutes to game time. In the event the visiting team is NOT ready for weigh-in when called for by the 'weighmaster,' the home team may opt to weigh-in first if they are ready.",
    keywords: ["weigh in time", "50 minutes", "55 minutes", "when does weigh in start", "not ready"]
  },
  {
    id: "II-2-i", cite: "Part II §2.i", category: "weigh-in",
    title: "Player arrives late — can they still weigh in and play?",
    levels: ["all"],
    answer: "A player may weigh in up to 15 minutes before kickoff. Arriving later than that: no first half — but if they weigh in at or before halftime, they can play the second half. The weighmaster notifies both coaches about late players who made weight.",
    text: "Players may weigh-in up to 15 minutes prior to the start of the game. Any player who arrives later shall not be allowed to play in the first half. Players in this situation must weigh-in at or before half time in order to play in the second half. The 'weighmaster' shall notify the coaches of both teams about players who were late but made weight under his/her supervision.",
    keywords: ["late arrival", "arrived late", "showed up late", "missed weigh in", "halftime weigh in", "15 minutes", "second half"]
  },
  {
    id: "II-2-j", cite: "Part II §2.j", category: "weigh-in",
    title: "What players wear on the scale (one trip only)",
    levels: ["all"],
    answer: "Players weigh in wearing ALL game equipment except the helmet (game shoes optional). One trip on the scale only — nothing may be removed to make weight, EXCEPT: a player who weighed with shoes on and missed weight may remove only the shoes and re-weigh once.",
    text: "All players shall weigh-in with ALL the equipment they will wear in the game EXCEPT for the helmet and optionally their game shoes. Once on the scale, the player may not remove any clothing or optional equipment in order to make weight — the player shall be on the scales once and only once to be weighed; except that a player who weighs with his shoes on and fails to make weight, may remove his shoes (nothing else) and re-weigh. Players shall not add gear, except the helmet and shoes, nor shall they change any gear, except that which may later be broken, in which case the change shall be to equipment of the same size.",
    keywords: ["what to wear", "helmet off", "shoes off", "reweigh", "re-weigh", "remove equipment", "one time on scale", "strip down"]
  },
  {
    id: "II-2-j34", cite: "Part II §2.j(3)–(4)", category: "weigh-in",
    title: "Equipment weight allowance (and skipping it)",
    levels: ["all"],
    answer: "Players who weigh in wearing equipment get the equipment allowance from the Age/Weight Chart added on top of their level's points (age-only players get it too). A player may instead weigh in WITHOUT equipment/uniform to make weight, but then gets NO allowance. Never naked / without proper undergarments.",
    text: "Weight allowances for uniform and equipment are outlined on the official GEJFA Age/Weight Chart... The equipment allowance is given to all players who weigh-in with their equipment on. The equipment allowance points are added on top of the points for the respective playing level. Players assigned by age points only also get the equipment allowance. Any player may elect to weigh-in without his equipment and uniform in order to make weight, however, said player will not be given the uniform and equipment allowances... In NO case will a player be allowed to weigh-in naked or without proper undergarments.",
    keywords: ["equipment allowance", "weight allowance", "weigh without pads", "underwear", "allowance points", "age weight chart"]
  },
  {
    id: "II-2-k", cite: "Part II §2.k", category: "weigh-in",
    title: "Players ruled unable to play",
    levels: ["all"],
    answer: "A player deemed unable to play removes helmet and shoulder pads before the game; the coach notifies the opposing coach and identifies those players on the roster.",
    text: "Players who are deemed unable to play WILL remove their helmet and shoulder pads prior to the game and said players' coach or representative shall notify the opposing coach or representative and identify said players on the roster.",
    keywords: ["cannot play", "remove pads", "sit out", "identify on roster", "unable"]
  },
  {
    id: "II-2-l", cite: "Part II §2.l", category: "weigh-in",
    title: "Missing weight two games in a row",
    levels: ["all"],
    answer: "Miss weight two consecutive games → the player moves UP to the next level. Missing weight one game then not playing the next counts as a second consecutive miss unless a satisfactory reason is given.",
    text: "A player who misses weight two consecutive games shall be moved up to the next playing level. A player who misses weight one game and then does not play in the next game is assumed to be overweight for a second consecutive game unless a satisfactory reason for missing that game is presented.",
    keywords: ["two consecutive", "moved up", "miss weight twice", "bumped up level", "consecutive games overweight"]
  },
  {
    id: "II-2-m", cite: "Part II §2.m", category: "weigh-in",
    title: "Weigh-ins in playoffs and matchup games",
    levels: ["all"],
    answer: "Playoff games: weigh-ins required. End-of-season match-up (consolation) games: no weigh-in needed — except a player who was overweight and disqualified the previous game must weigh in to qualify.",
    text: "Weigh-ins are required for playoff games. Weigh-ins are not required for match-up games at the end of the season. (Per §14.d: players in consolation games need not weigh-in, except those players who were overweight and thus disqualified in the previous game must weigh-in to qualify. Rosters are to be exchanged at all games including consolation games.)",
    keywords: ["playoff weigh in", "matchup game", "consolation weigh in", "postseason weigh in"]
  },

  // ---- Game day participation ----
  {
    id: "II-3-a", cite: "Part II §3.a", category: "game-day",
    title: "Holding a player out (non-participant waiver)",
    levels: ["all"],
    answer: "A coach may declare a rostered player a non-participant only with prior approval of the Club director, and must note it on the game roster given to the opposing coach (absent, injured, or disciplined). Every player must be accounted for — anyone not covered by a waiver indication is available and MUST play unless injured.",
    text: "A coach may declare a player on his/her roster a non-participant for a game by obtaining prior approval of his franchised Club director. The coach shall present a game waiver for non-participating players to the opposing coach prior to the start of the game. An indication on the game roster will serve as this waiver. The coach must account for every player on the roster; unless covered by a waiver indication (absent, injured, disciplined) all other players will be counted as present and available for game play. All available players must play in the game unless injured.",
    keywords: ["hold out player", "bench player", "non participant", "waiver", "discipline sit", "must play", "absent"]
  },
  {
    id: "II-3-b", cite: "Part II §3.b", category: "discipline",
    title: "Playing an ineligible player",
    levels: ["all"],
    answer: "Using an ineligible player (confirmed by the Grievance Committee) = automatic forfeit of EVERY game that player appeared in, plus immediate suspension of the head coach until the Grievance Committee reviews.",
    text: "The use of an ineligible player, subject to review and confirmation by the Grievance Committee, shall result in the following penalties: the automatic forfeiture of every game in which that player appeared; and the immediate suspension of the player's head coach until the matter has been reviewed by the Grievance Committee.",
    keywords: ["ineligible player", "illegal player", "forfeit", "coach suspended", "ringer"]
  },
  {
    id: "II-3-c", cite: "Part II §3.c", category: "discipline",
    title: "Ejection: what happens next",
    levels: ["all"],
    answer: "A player or coach ejected by an official automatically sits out the NEXT game. A second ejection in the same season = suspended for the rest of the season. Ejected coaches must appear before the Grievance Committee (with Club President and Head Coach) before reinstatement; if the committee can't meet in time, the GEJFA President may temporarily reinstate.",
    text: "Subject to GEJFA Grievance Committee review, a player or coach who is disqualified (ejected) by a game official is automatically ineligible for the next game. If the same player or coach is disqualified (ejected) a second time in one season, he is suspended for the remainder of the games that season. All coaches disqualified in a game and consequently suspended from the next game must appear before the Grievance Committee, accompanied by his/her Club President and team Head Coach prior to reinstatement. If the Grievance Committee is unable to meet prior to the game following the automatic game suspension, the coach may be temporarily reinstated by the GEJFA President pending an appearance before the Grievance Committee.",
    keywords: ["ejected", "ejection", "kicked out", "disqualified", "thrown out", "next game suspension", "second ejection", "season suspension"]
  },
  {
    id: "II-3-c3", cite: "Part II §3.c(3)", category: "discipline",
    title: "What a suspended coach/player may do on game day",
    levels: ["all"],
    answer: "A suspended coach or player may NOT be on the field (inside the fence) during that game. A suspended coach may have NO communication or contact of any kind with the team on game day until the game is over. The Club must monitor and enforce this.",
    text: "A coach or player who is suspended for a game shall not be on the field (inside fenced area) during that game. A suspended coach shall not have communication/contact of any type with the team on game day until after the game is completed. It is the responsibility of each Club to monitor the coach/team to be sure the suspension is enforced.",
    keywords: ["suspended coach", "no contact", "sideline ban", "texting team", "communication suspended", "serve suspension"]
  },
  {
    id: "II-3-d", cite: "Part II §3.d", category: "discipline",
    title: "Coach suspension for conduct",
    levels: ["all"],
    answer: "Coaches can also be suspended after Grievance Committee review of reported misconduct. Same game-day rules apply: zero communication/contact with the team until the game ends.",
    text: "Coaches may also be subject to suspension based on Grievance Committee review of a reported breach in proper conduct. A coach suspended for any reason shall not have communication/contact of any type with the team on game day until after the game is completed. It is the responsibility of each Club to monitor the coach/team to be sure the suspension is enforced.",
    keywords: ["conduct", "misconduct", "breach", "coach behavior", "grievance suspension"]
  },
  {
    id: "APP-B", cite: "Appendix B", category: "discipline",
    title: "Appealing a player ejection",
    levels: ["all"],
    answer: "Player ejections from judgment calls CAN be appealed with video: the Club's appointed board member contacts the Grievance Committee within 24 HOURS of the game's end, submitting video that clearly shows the play and the referee's penalty assessment. The committee decides within 48 hours (or before the next game if sooner). Its decision is final. Ignoring the decision = forfeit + head coach suspension.",
    text: "Player ejections resulting from a judgment call may be appealed. Video evidence, submitted by the Club's appointed board member, may be used to determine whether an ejection was due to incorrect judgment on the part of the ejecting official(s). The Club's appointed board member of the ejected player must contact the GEJFA Grievance Committee within 24 hours from the conclusion of the game. The video evidence must clearly document the situation/play including the referee's penalty assessment. The Committee has 48 hours from submission to decide (or decides before the next game if that game is sooner). The Grievance Committee shall review and either 1) affirm the head coach/designee with the understanding that the one (1) game suspension shall not be assessed, or 2) overrule the head coach/designee whereby the ejected player will be required to serve the one (1) game suspension. The decision of the GEJFA Grievance Committee regarding the ejection is final. Failure of the team to enforce the decision will result in forfeiture of the game the player appeared in, and immediate suspension of the player's head coach until reviewed by the Grievance Committee.",
    keywords: ["appeal ejection", "video evidence", "24 hours", "overturn ejection", "wrongly ejected", "judgment call appeal", "wiaa"]
  },

  // ---- Equipment ----
  {
    id: "II-4-a", cite: "Part II §4.a", category: "equipment",
    title: "Required gear and mouth guards",
    levels: ["all"],
    answer: "Players wear club-provided gear unless personal gear meets all safety standards (per head coach / Club Director / GEJFA). Full uniforms INCLUDING mouth guards are required at all contact practices and all games.",
    text: "Every player must wear gear provided by each Club unless his personal gear meets all safety standards as determined by his head coach, Club Director, and/or GEJFA, as may be appropriate. Players must wear full uniforms including mouth guards at all contact practices as well as all games.",
    keywords: ["mouth guard", "mouthpiece", "personal gear", "own equipment", "uniform required"]
  },
  {
    id: "II-4-b", cite: "Part II §4.b", category: "equipment",
    title: "Bandannas",
    levels: ["all"],
    answer: "Bandannas are not allowed on players during the game.",
    text: "Bandannas are not allowed on players while playing in the game.",
    keywords: ["bandanna", "bandana", "headwear", "do-rag", "skull cap"]
  },
  {
    id: "II-4-c", cite: "Part II §4.c", category: "equipment",
    title: "Athletic supporters / cups",
    levels: ["all"],
    answer: "Athletic supporters are required for all male participants; cups are NOT required.",
    text: "Athletic supporters are required for all male participants; cups are not required.",
    keywords: ["cup", "athletic supporter", "jock", "protective"]
  },
  {
    id: "II-4-d", cite: "Part II §4.d", category: "equipment",
    title: "Jersey numbers are locked for the season",
    levels: ["all"],
    answer: "Jersey numbers are recorded on the official roster and a player keeps that number all season unless the GEJFA Council approves a change.",
    text: "Game jersey numbers are to be recorded on each team's official rosters. A player must retain this number throughout the season unless permission to change is granted by the GEJFA Council.",
    keywords: ["change number", "jersey number", "switch numbers", "new jersey"]
  },
  {
    id: "II-4-e", cite: "Part II §4.e", category: "equipment",
    title: "Legal cleats",
    levels: ["all"],
    answer: "No metal or detachable cleats. Tennis-type shoes or molded rubber cleats (no sharp edges) are legal.",
    text: "No player may wear shoes with either metal or detachable cleats. Acceptable shoes are those of the tennis type and those with molded rubber cleats (no sharp edges).",
    keywords: ["cleats", "metal cleats", "detachable", "screw in", "shoes legal", "spikes"]
  },
  {
    id: "II-4-f", cite: "Part II §4.f", category: "equipment",
    title: "Playing with a cast or brace",
    levels: ["all"],
    answer: "A player in a hard (rigid) cast or brace may not participate in any contact — practice or game — unless it's wrapped in protective foam/rubber per NFHS rules AND approved by the head official before the game.",
    text: "Players may not participate in any contact, live or otherwise, in practice or games if wearing a hard (rigid) cast (or brace) unless said cast is wrapped with protective foam or rubber type substances per NFHS rules and approved by the head official at beginning of game.",
    keywords: ["cast", "brace", "broken arm", "splint", "wrapped", "padded cast", "hard cast"]
  },
  {
    id: "II-4-g", cite: "Part II §4.g", category: "equipment",
    title: "Legal football sizes by level",
    levels: ["all"],
    answer: "JV & Varsity: 'Youth/Intermediate' ball (10–11 in long, 26–27 in long circumference, 12–14 oz). Sophomore, Cub & Rookie: 'Junior' ball (9.5–10.5 in, 25–26 in, 11–13 oz). Leather, composite, or rubber all OK.",
    text: "Footballs may be leather, composite, or rubber. For Junior Varsity and Varsity levels: length 10–11 inches; long circumference 26–27 inches; short circumference 19–20 inches; and weight 12–14 oz (e.g., 'Youth' or 'Intermediate' designation). For Sophomore, Cubs, and Rookies levels: length 9 1/2–10 1/2 inches; long circumference 25–26 inches; short circumference 18–19 inches; and weight 11–13 oz (e.g., 'Junior' designation).",
    keywords: ["ball size", "football size", "junior ball", "youth ball", "intermediate ball", "what ball"]
  },
  {
    id: "II-4-h", cite: "Part II §4.h", category: "equipment",
    title: "Jersey colors: home wears home",
    levels: ["all"],
    answer: "Home team wears its designated home jersey; visitors wear their away jersey and must ensure contrast with the home color. If a conflict is expected, club heads contact each other the week BEFORE the game. Color changes need Council approval.",
    text: "All uniform color changes must be approved by the GEJFA Council. All Clubs are to have two jersey colors available, one light and one dark, to avoid game day jersey color conflicts. The home team shall wear their designated 'home' jersey and the visiting team shall wear their designated 'away' jersey. The visiting team is otherwise responsible for ensuring that their jerseys contrast in color with the home team jersey. Where conflicts are anticipated, opposing Club heads shall make contact in the week before the game to resolve conflict before game day.",
    keywords: ["jersey color", "color conflict", "same color", "home away jersey", "alternate jersey"]
  },

  // ---- Game management ----
  {
    id: "II-5-a", cite: "Part II §5.a", category: "game-day",
    title: "Home/visitor game-day duties",
    levels: ["all"],
    answer: "Home team provides the official clock, down box, yard markers, and chains. The chains are run on the VISITOR side by visiting-team volunteers. The home club provides a field manager (inspects field, runs weigh-in, mediates disputes). Every team needs a first-aid kit at the bench and at least one first-aid-certified person.",
    text: "The designated home team will provide the official time clock, down box, yard markers and chains. The down box and chains will be operated on the visitor's side of the field by volunteers from the visiting team. Each Club shall have a field manager at their home games (inspects the playing field, conducts the game day weigh-in, monitors roster exchange, arranges the chain crew, checks with game officials, keeps spectators behind the boundary; mediates disputes). All teams shall have a first aid kit at their benches. At least one coach or other designated person on each team shall be first aid certified.",
    keywords: ["chains", "chain crew", "down box", "clock", "field manager", "first aid kit", "home team duties", "volunteers"]
  },
  {
    id: "II-5-b", cite: "Part II §5.b", category: "game-day",
    title: "Game balls and ball attendants",
    levels: ["all"],
    answer: "Each team may use its own ball if it meets size and inflation standards (officials have final say). A ball attendant may dry a wet ball between plays but may not communicate with players, coaches, or officials beyond that duty.",
    text: "Each team may use its own ball so long as it conforms to proper size and inflation standards (subject to final approval of the game officials). A team may have an on-field attendant to dry a wet football between plays, but that person may not communicate with the players, coaches, or officials except as required to execute his duty.",
    keywords: ["own ball", "ball boy", "wet ball", "dry ball", "ball attendant"]
  },
  {
    id: "II-5-c", cite: "Part II §5.c", category: "game-day",
    title: "Who's allowed inside the fence / spectator line",
    levels: ["all"],
    answer: "Fenced fields: only players, coaches, officials — plus rostered statisticians and ONE still photographer (outside the team box; no videographers inside the fence). Unfenced fields: spectators stay at least 5 yards off the sideline.",
    text: "At high school fields where the playing field is fenced from the spectator areas, only the game participants (players, coaches, and officials) may be inside the fenced area. This may also include rostered team statisticians and one still photographer who shall be outside the team box. No videographers will be allowed in the fenced area. On fields where such fencing does not exist, coaches shall inform spectators that League rules require all spectators remain five (5) yards or more from the sideline. Nothing prohibits a Club from establishing stricter field access rules.",
    keywords: ["fence", "sideline access", "parents on field", "spectators", "5 yards", "who allowed on sideline", "statistician"]
  },
  {
    id: "II-5-d", cite: "Part II §5.d", category: "game-day",
    title: "Quarter length by level",
    levels: ["all"],
    answer: "Rookies (8-player) and Cubs: 8-minute quarters. Sophomore, JV, Varsity: 10-minute quarters. High school (NFHS) timing rules apply.",
    text: "8 Player Football (Rookies) and Cubs will each play 8 minute quarters. Sophomores, Junior Varsity and Varsity will play 10 minute quarters. All games will be played per high school rule book timing rules.",
    keywords: ["quarter length", "how long quarters", "game length", "8 minute", "10 minute", "timing"]
  },
  {
    id: "II-5-e", cite: "Part II §5.e", category: "game-day",
    title: "Roster exchange and disciplinary benching",
    levels: ["all"],
    answer: "Official GEJFA weigh-in rosters (with jersey numbers) MUST be exchanged before the game — using any other roster is a disciplinable offense. Players held out for discipline must be noted on the roster with the number of quarters withheld; the benching starts at kickoff and runs consecutive quarters, with Club Director knowledge/concurrence.",
    text: "GEJFA weigh-in rosters with game jersey numbers must be exchanged between coaches prior to the start of the game. Any coach exchanging a roster other than an official GEJFA roster will be subject to disciplinary review and action. Players being withheld from participating due to team disciplinary reasons must be so noted on the roster, with the number of quarters they will be withheld also noted. All such disciplinary actions must begin with the start of the game and run through consecutive quarters. Discipline should only be applied with the knowledge and concurrence of the Club Director or per Club Bylaws or other established policy.",
    keywords: ["roster exchange", "discipline quarters", "benched", "withheld", "official roster", "quarters noted"]
  },
  {
    id: "II-5-f", cite: "Part II §5.f", category: "game-day",
    title: "Pregame coaches meeting",
    levels: ["all"],
    answer: "About 10 minutes before kickoff (before the coin toss), both teams' coaches meet at midfield to cover introductions, player concerns (injuries/discipline), sportsmanship, field management, and score management. The referee may observe but doesn't run it.",
    text: "Prior to the coin toss, about 10 minutes before the start of the game, coaches from both teams shall meet at the center of the field to cover: introductions, player concerns (injuries, discipline, etc.), sportsmanship, field management, and score management. If the referee is available, he/she may join in and observe this meeting, however, the referee is not in charge of the discussion. The field manager may also join as an observer.",
    keywords: ["pregame meeting", "midfield meeting", "coin toss", "coaches meet"]
  },
  {
    id: "II-5-g", cite: "Part II §5.g", category: "game-day",
    title: "Coaches on the field during play",
    levels: ["all"],
    answer: "Varsity/JV/Sophomore/Cub: coaches on the field only during timeouts or injuries. Rookie: ONE coach per team allowed on the field; he may call plays and adjust between plays but must stop talking once the offense breaks the huddle — first violation is a warning; further violations could result in a 5-yard 'On-Field Interference' penalty. No-huddle offense is NOT permitted at Rookie.",
    text: "Coaches of the Varsity, Junior Varsity, Sophomore and Cub teams will not be permitted on the field of play except during a time-out or in the case of an injury. At the Rookie level, one coach from each team is permitted on the field at any time. The coach on the field may call the plays and make necessary adjustments between scrimmage plays. He may in no way interfere with the play of either team; including talking to or shouting at his or opposing players once the offensive team has broken their huddle. If a coach is still communicating after the huddle has broken, a warning will be issued by the referee. A second violation, and all subsequent violations could result in a 5 Yard Penalty for 'on Field Interference.' (Policy: The purpose of coaches on the field is instructional, therefore a no huddle offense is not permitted.)",
    keywords: ["coach on field", "on field coach", "talking after huddle", "interference penalty", "no huddle", "rookie coach"]
  },
  {
    id: "II-5-h", cite: "Part II §5.h", category: "game-day",
    title: "How many officials per game",
    levels: ["all"],
    answer: "Target: 3 officials per game, 4 for Sophomore/JV/Varsity. Rookies (8-player): 2 officials = full crew. Cubs: 3 = full crew. The home club provides officials with refreshments.",
    text: "There will be an attempt to assign three (3) game officials to every game and a fourth (4) for Sophomore, JV and Varsity games. For 8 Player Football (Rookies), two (2) officials will constitute a full crew, however, more may be assigned. For Cubs, three (3) officials constitute a full crew, however, a fourth may be assigned. The home/host Club is responsible for providing game officials with proper refreshments.",
    keywords: ["officials", "referees", "how many refs", "full crew", "short crew"]
  },
  {
    id: "II-5-i", cite: "Part II §5.i", category: "game-day",
    title: "Electronic communications ban (radios, cell phones)",
    levels: ["all"],
    answer: "ANY game-related electronic communication (cell phones, two-way radios, transmitters, etc.) between coaches, coaches-parents, or coaches-players is illegal during your game. Penalty (after Grievance review): automatic forfeit of the game + immediate suspension of all coaches involved, who must appear before the Grievance Committee before coaching again. Cell phone calls must be taken outside/away from the team box.",
    text: "Any game related communications between coaches, coaches and parents, or coaches and players using electronic devices such as, but not limited to, cell phones, two-way radios, transmitters, etc., shall be deemed illegal for any game in which your team is a participant. Violation, subject to review and substantiation by the Grievance Committee, will cause automatic forfeiture of any game in which illegal electronic communications were used, and immediate suspension of all coaches involved. The suspended coaches must appear before the Grievance Committee before coaching another game. To minimize distractions and interference, cell phone communications are not to occur on the sidelines; those receiving or making calls shall step out of and away from the team box.",
    keywords: ["radios", "walkie talkie", "headsets", "cell phone sideline", "electronics", "spotter", "booth communication", "texting plays"]
  },
  {
    id: "II-5-j", cite: "Part II §5.j", category: "game-day",
    title: "Scouting rules",
    levels: ["all"],
    answer: "You may scout other teams at GAMES and JAMBOREES only — never practices, by any means. Video scouting of games is allowed from the stands (not the booth).",
    text: "Coaches or their representatives may scout other teams in games and jamborees only. Scouting by video of games is allowed. Video scouting shall be from the stands. Scouters shall not be in the booth. Scouting of practices (not including jamborees) by any means is prohibited.",
    keywords: ["scouting", "scout opponent", "film opponent", "watch practice", "spying"]
  },
  {
    id: "II-5-k", cite: "Part II §5.k", category: "game-day",
    title: "Photo and video rules",
    levels: ["all"],
    answer: "Film/photograph from your side, in the stands or beyond the field boundary. One still photographer per team may be on the sideline outside the team box (where the field allows). Stationary AI-type tripod cameras that don't live-broadcast are OK on the track/behind your bench with field manager permission. Coaches/team photographer may NOT shoot sideline smartphone footage. Field-camera video, if used, must be shared with both teams. Misbehaving photographers can be shut down and lose field access for the whole team.",
    text: "Picture taking and videotaping is allowed from your side of the field in the stands or beyond the playing field boundary except that one still picture photographer per team may be on the sideline outside the team box (except on fields that prohibit it). As permitted by the field manager, stationary AI type cameras (typically on a tall tripod) that do not live broadcast are allowed on the track or behind the filming team bench. Sideline smartphone footage is not allowed by coaches or the team photographer. There will be no filming of practices not involving your team. Where field video cameras exist, the video from those cameras, if used, shall be shared with both the teams involved. Teams may share game video, but are not required to do so. Photographers who don't follow the rules may be shut down and/or asked to leave the field; repeat issues bar that team's photographers from inside the fence.",
    keywords: ["video", "filming", "camera", "photographer", "veo", "hudl", "tripod", "smartphone video", "share film"]
  },

  // ---- 8-Player Football (Rookie) ----
  {
    id: "II-6-a", cite: "Part II §6.a", category: "8-player",
    title: "8-player: players on the field",
    levels: ["rookie"],
    answer: "8 players per side. Five must be on the line of scrimmage: two eligible receivers and three ineligible linemen. Roster: minimum 11, maximum 21.",
    text: "The number of players on the field per team is eight (8). Five players must be on the line of scrimmage; two eligible receivers, and three ineligible linemen. The minimum roster size is 11 players to field a team for the season; the maximum roster size is 21.",
    keywords: ["8 man", "eight player", "players on field", "line of scrimmage", "eligible receivers", "formation"]
  },
  {
    id: "II-6-b", cite: "Part II §6.b", category: "8-player",
    title: "8-player: field size and ball spot",
    levels: ["rookie"],
    answer: "Field is 100 yards long but only 35 yards wide — home sideline to the far hashmarks (the far hash is the visitor sideline). Every play is spotted on the home-side hashmark, equidistant from each sideline.",
    text: "The field is 100 yards from goal line to goal line. End zones are 10 yards deep. The field is 35 yards wide, from the usual home sideline to the far/visitor side hashmarks (the hashmarks become the visitor sideline). For each play, regardless which team has possession, the ball is spotted on the (home team's) hashmark which is equal distance from each sideline.",
    keywords: ["field size", "narrow field", "35 yards wide", "hashmark", "spot ball", "field dimensions"]
  },
  {
    id: "II-6-c", cite: "Part II §6.c", category: "8-player",
    title: "8-player: coach on the field",
    levels: ["rookie", "cub"],
    answer: "One coach on the field at ROOKIE only. NO coach on the field at Cub.",
    text: "Per rule 5.g.(2), one coach is allowed on the field at the Rookie level only. There will be no coach allowed on the field at the Cub level.",
    keywords: ["coach on field cub", "rookie coach field"]
  },
  {
    id: "II-6-d", cite: "Part II §6.d", category: "8-player",
    title: "8-player PAT (kick = 2, run/pass = 1)",
    levels: ["rookie"],
    answer: "Ball spotted at the 3-yard line for either try. Kick try (worth 2): must be snapped, held, and kicked; the holder may move to get the ball; kicker gets exactly ONE swing once the ball is on the tee (a whiff or shank counts as the attempt); NO fakes; no one may cross the line of scrimmage; on-field coaches must be clear. If there's a penalty before the kick, replay the kick after assessment — but offsides/encroachment don't apply.",
    text: "If scoring team opts for a two-point attempt (no rush kick): the ball is spotted at the three (3) yard line. Coaches (as allowed at the Rookie level only) must be clear of the play. No player may cross the line of scrimmage at any time during the attempt. The ball must be snapped by the center, held and kicked. The holder may move to get the ball. The kicker will have one attempt at kicking the ball once the holder places the ball on the tee. Missing the ball completely, shanking it, or hitting it square is considered an attempt. NO FAKES ALLOWED. If a rule infraction occurs prior to the kick, the kick shall be replayed after the penalty has been assessed; however, offsides and encroachment penalties shall not apply. For a one (1) point attempt, the ball is placed at the three (3) yard line.",
    keywords: ["rookie pat", "no rush kick", "fake kick", "extra point rookie", "tee", "shank", "one attempt"]
  },
  {
    id: "II-6-ef", cite: "Part II §6.e–f", category: "8-player",
    title: "8-player: no field goals, no kickoffs",
    levels: ["rookie"],
    answer: "No field goals and no kickoff play. Offense starts at its own 35. Onside-kick alternative: 4th and 10 from your own 25. Punts exist (free punt, no return) and are subject to the substitution rule.",
    text: "There is no field goal (FG) and no kickoff play. There are still punts (no return), but still subject to the substitution rule. In lieu of kickoffs, the offense starts scrimmage play on their own 35 yard line. Onside kick placement: 4th down & 10 yards from own 25.",
    keywords: ["field goal rookie", "no fg", "kickoff rookie", "start at 35", "onside rookie"]
  },
  {
    id: "II-6-g", cite: "Part II §6.g", category: "8-player",
    title: "8-player free punt rule",
    levels: ["rookie"],
    answer: "All punts must be DECLARED to the referee; the clock stops until the ball is punted. Both teams put all 8 within 3 yards of the line (except the punter). The punt may be blocked but NOT returned — it's dead where it stops, even short of the line. No one crosses the line until the ball is punted. Pre-punt infractions: assess and re-punt (offsides/encroachment don't apply).",
    text: "There is a free punt rule in 8 Player Football, and all punts must be declared. If the offensive team wishes to have a free punt, they notify the referee and the referee will notify the other team. The clock then stops until the ball is punted. Both teams must have 8 players within 3 yards of the line of scrimmage, except the punter, and the coaches on the field must stay clear of the punted ball. The ball may be blocked but not returned and is dead where it stops within the field of play, whether or not it crosses the line of scrimmage. No player may cross the line of scrimmage until the ball is punted. If a rule infraction occurs prior to the punt, the punt shall be replayed after the penalty has been assessed; however, offsides and encroachment penalties shall not apply.",
    keywords: ["free punt", "declared punt", "punt return rookie", "blocked punt", "4th down rookie"]
  },
  {
    id: "II-6-hi", cite: "Part II §6.h–i", category: "8-player",
    title: "8-player: score management & substitution apply",
    levels: ["rookie"],
    answer: "The 25-point score-management rules apply, with 8-player spots: trailing team starts offense from MIDFIELD; the leading team starts from its own 15. The substitution rule and all other unaltered game-management rules also apply.",
    text: "The score management rules of paragraph 9 below apply [the rulebook's cross-reference; the Score Management rules are §10]; the trailing team starts offense from midfield, the leading team starts offense from its own 15. The substitution rule of paragraph 7 applies as does any other game management rule not altered by the 8 Player Football format.",
    keywords: ["rookie mercy", "rookie blowout", "own 15", "midfield start"]
  },

  // ---- Substitution rule ----
  {
    id: "II-7-a", cite: "Part II §7.a", category: "substitution",
    title: "The substitution rule (empty the bench)",
    levels: ["all"],
    answer: "On EVERY change of possession (fumble, downs, interception, punt), the coach must empty the bench and replace all players on the field, if possible. The new group stays on for FOUR consecutive legal plays (unless possession changes again). After 4 plays, substitute freely — until the next change of possession restarts the cycle.",
    text: "Upon the change of possession (i.e., fumble, loss of down, pass interception, or punt) a coach must empty his bench and replace all of his players on the field, if possible. After a proper substitution, all players then on the field shall remain on the field for four consecutive legal plays, unless the ball changes possession. After a minimum of four plays following a change in possession, a coach may substitute freely. However, when the ball changes possession, he must again empty his bench and replace all players currently on the field, if possible, for a minimum of four consecutive plays.",
    keywords: ["empty bench", "four plays", "4 plays", "change of possession", "sub rule", "mandatory substitution", "platoon"]
  },
  {
    id: "II-7-a3", cite: "Part II §7.a(3)–(5)", category: "substitution",
    title: "Substitution after scores and injuries",
    levels: ["all"],
    answer: "After a touchdown or field goal: free substitution for the try, then the substitution rule RESTARTS at the next scrimmage play. Injured player: free substitution for him; he may return after sitting at least one play. An injury sub doesn't cancel the empty-bench duty at the next change of possession.",
    text: "Should a team score a touchdown or kick a field goal (no FG in 8 Player Football), free substitution is allowed for the extra point try. At the beginning of scrimmage play following a score, the substitution rule is re-instituted (starts over). If a player is injured, a free substitution may be made for the injured player. Even following an injury substitution, when the ball changes possession, the coach must again empty his bench and replace all players on the field, if possible, for a minimum of four consecutive plays. Otherwise, the injured player may return to action, after sitting out a minimum of one play.",
    keywords: ["sub after touchdown", "injury substitution", "free sub", "return after injury", "sit one play"]
  },
  {
    id: "II-7-b", cite: "Part II §7.b", category: "substitution",
    title: "Injured player on the bench",
    levels: ["all"],
    answer: "An injured player removes his/her helmet and sits on/near the bench. Out for a prolonged period → shoulder pads come off too.",
    text: "An injured player should remove his/her helmet and sit on or near the team bench. If the injured player is out for a prolonged period of time, he/she should remove his/her shoulder pads and helmet.",
    keywords: ["injured bench", "helmet off injured", "hurt player"]
  },
  {
    id: "II-7-c", cite: "Part II §7.c", category: "substitution",
    title: "Every player plays at least 12 plays",
    levels: ["all"],
    answer: "ALL players — including those being disciplined for part of the game — must play at least TWELVE plays from scrimmage during the game. The Council's intent is equitable playing time for everyone.",
    text: "It is the intent of the GEJFA council that all players get equitable playing time. But in any event, all players, including those who may be subject to discipline for some part of the game, must play at least twelve plays from scrimmage during the game period.",
    keywords: ["minimum plays", "12 plays", "twelve plays", "playing time", "equal time", "kid didn't play"]
  },
  {
    id: "II-7-d", cite: "Part II §7.d", category: "substitution",
    title: "Substitution rule violations",
    levels: ["all"],
    answer: "After Grievance review: possible forfeiture and coach suspension/termination. The club can land on 'Substitution Rule Probation' for the rest of this season plus ALL of next season; violating while on probation usually means automatic forfeit (even if the violation didn't affect the outcome) and possible playoff ineligibility. Even violating the SPIRIT of the rule can draw discipline.",
    text: "Violations of the substitution rule, subject to review by the Grievance Committee, may result in: forfeiture of the game and the suspension or termination of the coach. The Host Club of any team found in violation can be put on 'Substitution Rule Probation' for the remainder of that season and the entirety of the following season. Violating teams from a Club already on probation will in most cases, upon review by the Grievance Committee, automatically forfeit the game in question even if it is determined that the violation didn't affect the outcome of the game. Any Club found in substantial violation while on probation may be ruled ineligible for participation in the playoffs. Coaches violating even just the spirit of this rule may be subject to disciplinary action of the GEJFA Council.",
    keywords: ["substitution violation", "sub probation", "penalty substitution", "forfeit substitution"]
  },

  // ---- Kickoffs & PAT ----
  {
    id: "II-8", cite: "Part II §8", category: "kickoffs-pat",
    title: "No kickoffs — ball starts at the 35",
    levels: ["all"],
    answer: "There are NO kickoffs at any level. The would-be receiving team simply takes the ball at its own 35, 1st and 10. After a safety, the other team takes the ball at the 50.",
    text: "There are no kickoffs at any playing level. In place of kickoffs, the ball is given to what would otherwise be the receiving team at their own 35 yard line, first and 10. In the case of a safety, the opponent team will take the ball on offense at the 50 in lieu of receiving a kick.",
    keywords: ["kickoff", "no kickoffs", "start at 35", "safety possession", "kick return", "opening kick"]
  },
  {
    id: "II-8-b", cite: "Part II §8.b", category: "kickoffs-pat",
    title: "Onside 'kick' alternative (late, trailing)",
    levels: ["all"],
    answer: "If the trailing team scores a TD with under 4 minutes left and is STILL behind, it may elect to take the ball at its own 25, 4TH and 10 — the onside-kick substitute. It's a timed down, normal penalties, substitution rule applies, and once declared you can't change your mind. (If still down 25+, score management overrides: ball at the 50, 1st and 10.)",
    text: "If the trailing team scores a touchdown with less than four (4) minutes to go in the game, after which they are still trailing, that team may elect to take the ball on their own 25 yard line, fourth and 10 (in lieu of what might be an onside kick). The score management rules still apply, so if the trailing team scores and is still down by 25 or more points, that team gets the ball on the 50, first and 10. This is a timed down (the substitution rule applies). All penalties are enforced as normal. Once a team declares their intentions to try this alternative to an onside kick, they cannot change their mind.",
    keywords: ["onside kick", "onside alternative", "4th and 10", "fourth and ten", "under 4 minutes", "comeback", "late game trailing"]
  },
  {
    id: "II-8-d", cite: "Part II §8.d", category: "kickoffs-pat",
    title: "Penalties on plays before a would-be kickoff",
    levels: ["all"],
    answer: "A foul on any play preceding what would have been a kickoff (e.g., roughing the kicker or unsportsmanlike on a successful PAT) is assessed from the spot of the ball where play is to resume.",
    text: "For a foul on any play preceding what would have been a kickoff, the ensuing penalty will now be assessed from the spot of the ball where play is to resume. (Note: This includes roughing the kicker or any unsportsmanlike penalty against the defense on a successful PAT).",
    keywords: ["penalty on pat", "unsportsmanlike after score", "roughing kicker", "enforce penalty kickoff"]
  },
  {
    id: "II-9", cite: "Part II §9", category: "kickoffs-pat",
    title: "PAT values: kick = 2, run/pass = 1",
    levels: ["all"],
    answer: "At ALL levels: a PAT conversion KICK is worth TWO points; a run or pass PAT is worth ONE point.",
    text: "At all levels: a point after touchdown conversion kick will be worth two (2) points. A run or pass PAT will be worth one (1) point.",
    keywords: ["pat", "extra point", "two point", "conversion", "point after touchdown", "kick worth", "try"]
  },

  // ---- Score management ----
  {
    id: "II-10-a", cite: "Part II §10.a", category: "score-mgmt",
    title: "Down 25+? Take the ball",
    levels: ["all"],
    answer: "Any team behind by 25+ points — even right after scoring, or at the start of the second half — may ELECT to take possession of the ball.",
    text: "Any team that is behind by twenty-five (25) points or more even after just scoring a touchdown, field goal, or point after touchdown, or at the start of the second half may elect to take possession of the ball.",
    keywords: ["down 25", "take possession", "keep ball", "behind by 25", "elect possession"]
  },
  {
    id: "II-10-b", cite: "Part II §10.b", category: "score-mgmt",
    title: "The 32-Point Rule and 25-point protocol",
    levels: ["all"],
    answer: "It is the intent and spirit of the Council that no team defeat — or at any point lead — an opponent by more than 32 points. At 25+ ahead, either coach may call a league timeout to discuss protocol, and special possession rules kick in: after a score creating the gap, the TRAILING team takes the ball at the 50 (no kickoff); when the trailing team gains possession it starts at the 50 (or the spot if inside the opponent's 50); when the LEADING team takes possession outside its own 20, the ball moves BACK to its 20.",
    text: "The 32 Point Rule: It is the intent and spirit of the GEJFA Council that no team shall defeat, nor shall it at any point in the game lead an opponent by more than 32 points. Any time a team is ahead by 25 or more points, either coach may call a league timeout in order to discuss further game protocol. When the score differential is 25 or more points: after a score that creates this differential, the trailing team will take possession and start their offensive series at the 50 yard line; there will be no kick-off. When the trailing team takes possession of the ball, it shall start its offensive series at the 50 yard line or at the point of possession if inside the other team's 50. When the leading team takes possession anywhere outside its own 20 yard line, the ball will be moved back to that team's 20 yard line to start the offensive series.",
    keywords: ["32 point rule", "mercy rule", "mercy", "blowout", "running up score", "25 points", "lead cap", "50 yard line start", "back to 20"]
  },
  {
    id: "II-10-b2d", cite: "Part II §10.b(2)(d)", category: "score-mgmt",
    title: "Leading team pinned inside the 20 → ball flips",
    levels: ["all"],
    answer: "While up 25+: if at the end of any play the leading team's next snap would be at or inside the TRAILING team's 20-yard line, possession immediately flips to the trailing team at the 50. Also, no penalty (even a mandatory one) may advance the ball to/inside the 20 without first giving the leading team the choice to decline.",
    text: "At the end of any play, if the team in possession of the ball is ahead by 25 or more points, and the line of scrimmage for the next play will be at or inside the 20-yard line of the trailing team, then possession is immediately given to the trailing team on the 50-yard line. However, the ball may not be advanced to or inside the 20 yard line by any penalty (including those that are mandatory) without first giving the leading team a choice to decline.",
    keywords: ["red zone give up ball", "inside 20", "flip possession", "20 yard line rule", "cant score"]
  },
  {
    id: "II-10-b2e", cite: "Part II §10.b(2)(e)–(g)", category: "score-mgmt",
    title: "Running clock",
    levels: ["all"],
    answer: "A 25+ point gap at the start of the 4th quarter (or any time in the 4th) = running clock, stopped only for injuries or timeouts. Both coaches can agree to a running clock at ANY time. If the gap drops below 25, regular play resumes — but once a running clock, ALWAYS a running clock.",
    text: "At the beginning of the 4th quarter or at such time in the 4th quarter that a 25 point or more score differential exists, the game clock will go to a running clock and will be stopped only for injuries or time outs. Game clock can go to a running clock at any time during the game if both coaches agree. If the score differential drops below 25 points, then regular play (i.e., kick-offs) will resume, except that once a running clock, always a running clock.",
    keywords: ["running clock", "continuous clock", "clock rules blowout", "4th quarter clock"]
  },
  {
    id: "II-10-c", cite: "Part II §10.c", category: "score-mgmt",
    title: "Penalties for violating the 32-point rule",
    levels: ["all"],
    answer: "Exceed a 32-point lead OFFENSIVELY → head coach automatically suspended for the next game (no hearing needed). Exceed it on a DEFENSIVE score → coach meets the Grievance Committee before the next game. Win by MORE than 38 in any situation → automatic next-game suspension. Suspended = zero team contact on game day. A SECOND 32-point violation (or violating the no-contact rule) = suspended for the season, no appeal.",
    text: "If a team exceeds the 32 point margin offensively, the Head Coach shall automatically be suspended by his/her Club for the next game. No appearance before the Grievance Committee is required. If a team exceeds the 32 point margin and the last score was defensive, the Head Coach shall meet with the Grievance Committee before coaching the next game, unless excused by the Grievance Committee because it is unable to meet in a timely manner. If a team's margin of victory is more than 38 points by any situation, the Head Coach is automatically suspended for the next game. A coach on suspension for violation of the 32 point rule cannot have communication/contact of any type with the team on game day, until after the game is completed. A second violation of the 32 point rule, or a violation of the game day contact rule, will result in a coach being suspended for the remainder of the season. These suspensions may not be appealed.",
    keywords: ["won by too much", "38 points", "suspension 32", "beat by 40", "margin of victory", "auto suspension"]
  },
  {
    id: "II-10-d", cite: "Part II §10.d", category: "score-mgmt",
    title: "Point differential never matters for standings",
    levels: ["all"],
    answer: "Margin of victory has NO effect on standings or playoff seeding — ever.",
    text: "Point differential in games never has any effect on the standings or playoff seeding.",
    keywords: ["point differential", "seeding points", "score margin standings", "tiebreaker points scored"]
  },

  // ---- Playoffs, ties, scheduling ----
  {
    id: "II-11-b", cite: "Part II §11.b", category: "playoffs",
    title: "Seeding shootout format (pre-playoff tiebreaker)",
    levels: ["all"],
    answer: "When a shootout must break a standings tie: coin toss for possession choice (team traveling farthest = visitor). Each team gets 1st-and-10 from the 20; if still tied, from the 10, repeating from the 10 until decided. TDs include a PAT try. Substitution rule applies (empty bench on any change of hands), one timeout per session. Three-way tie: coin toss gives one team a bye, then series play per rule 11.b(1).",
    text: "If a tie breaker format is needed to determine team seeding for playoff games: For a three-way tie, a coin toss will determine which team will be awarded a first-round bye (detailed series procedures per §11.b(1)(a)–(b)). A coin toss will determine which team gets choice of possession. For purposes of the coin toss, the team traveling the farthest will be the visiting team. Each team will have a 1st and 10 from the 20 yard line; if this session ends in a tie, then another session of 1st and 10 from the 10 yard line; if this results in a tie, then play will continue subsequent sessions from the 10 yard line until a winner is decided. If a touchdown is scored, the point after touchdown will be tried. The substitution rule is in effect throughout except when the ball changes hands the coach must again empty his bench for a minimum of four consecutive plays. Each team will have one timeout per complete session.",
    keywords: ["shootout", "seeding tiebreaker", "three way tie", "coin toss seed", "from the 20"]
  },
  {
    id: "II-11-c", cite: "Part II §11.c–d", category: "playoffs",
    title: "Overtime in playoff games",
    levels: ["all"],
    answer: "Playoff game tied after regulation: coin toss for possession choice; each team gets 1st-and-10 from the 10; still tied → 1st-and-goal from the 5, repeating from the 5 until decided. TDs get a PAT try; substitution rule stays in effect. CHAMPIONSHIP games: same format, but after TWO full tiebreak sessions still tied, the game ENDS as a tie.",
    text: "If a playoff game ends in a tie following regulation play: a coin toss will determine which team gets choice of possession. Each team will have a 1st and 10 from the 10 yard line; if this results in a tie, then 1st and goal from the 5 yard line; if this results in a tie, then play will continue from the 5 yard line until a winner is decided. If a touchdown is scored, the point after touchdown will be tried. The substitution rule is in effect throughout tie breaker play. Ties in Championship Games are resolved the same way, except that after two complete tie breaker sessions, if the score is still tied, then the game shall end at that point in a tie.",
    keywords: ["overtime", "ot", "tied game", "playoff tie", "championship tie", "extra period", "from the 10"]
  },
  {
    id: "II-12", cite: "Part II §12", category: "game-day",
    title: "Interrupted games (weather, lightning, lights)",
    levels: ["all"],
    answer: "Resume as soon as safe — same day if possible. If not, report to the League President and scheduler by end of game day; resumption is typically the following Tuesday or Wednesday evening, from the exact point of interruption (per HS rules) — unless both teams agree to end it with the existing score. If the score is lopsided, terminating is encouraged; if teams can't agree, the League rules.",
    text: "Interrupted games shall be resumed as soon as it is safe to do so, the same day if possible. If unable to resume the same day, they shall be reported to the League President and the scheduler by the end of game day. Every attempt will be made to schedule a field and time to resume play, most likely the following Tuesday or Wednesday evening. Per High School rules, interrupted games will be resumed at the point of interruption, unless the involved teams agree to terminate the game with the existing score. If the existing score at the point of interruption is already lopsided, teams are encouraged to terminate. If agreement to terminate cannot be reached, the League will rule on the matter.",
    keywords: ["lightning", "weather delay", "suspended game", "resume game", "storm", "lights out", "postponed"]
  },
  {
    id: "II-13-abc", cite: "Part II §13.a–c", category: "protests",
    title: "Protesting a game / an official's call",
    levels: ["all"],
    answer: "You CANNOT protest a judgment call. You CAN protest an official's INTERPRETATION of a game or association rule: written protest from the head coach, with Club Director concurrence, to the GEJFA President by 8:00 AM Monday after the game.",
    text: "Protests of any nature are discouraged as detrimental to the spirit and intent of the GEJFA. A protest on any official's judgmental call will not be accepted. A protest of the official's interpretation of a game or association rule may be submitted. Any alleged infraction for which the game is under protest must be submitted in writing by a head coach with the concurrence of and via his Club Director, to the GEJFA President by 8:00am Monday morning following the game.",
    keywords: ["protest game", "bad call", "wrong rule", "referee mistake", "monday 8am", "file protest"]
  },
  {
    id: "II-13-e", cite: "Part II §13.e", category: "protests",
    title: "Protesting a substitution violation (exact procedure)",
    levels: ["all"],
    answer: "In-game: ask the officials for an official's timeout to discuss a league rule; at midfield tell the opposing coach, \"You are violating the league substitution rule,\" and specify exactly how; try to resolve it. If it happens AGAIN: repeat, adding that a formal protest will go to the Grievance Committee — then drop it for the rest of the game and file a written protest (via Club Director) to the President by 8 AM Monday. Family members cannot protest. Skipping the procedure forfeits the protest (though the committee can still act on its own).",
    text: "The coach wishing to protest will ask the game officials to provide an official's time out for the purpose of discussing a league rule with the opposing coach. The head coach will then be invited to the middle of the field where the protesting coach will state, 'You are violating the league substitution rule,' and must then specify the exact nature of the violation. These coaches will make every effort to resolve the situation. A subsequent violation in the same game is handled the same way; however, the protesting coach may add, 'A formal protest of these violations will be made to the GEJFA Grievance Committee.' No further discussion during the game. The protesting coach, via his Club Director, should then submit a letter of protest to the GEJFA President by 8:00am Monday morning. The Grievance Committee will call a special meeting; the filing coach must attend. No protests by family members of players are allowed. When these procedures are not followed, the protest will not be heard; however, the matter may still be reviewed by the Grievance Committee.",
    keywords: ["substitution protest", "not subbing", "other team not substituting", "protest procedure", "official timeout rule discussion"]
  },
  {
    id: "II-14-a", cite: "Part II §14 (Schedules)", category: "playoffs",
    title: "Season format and standings points",
    levels: ["all"],
    answer: "8-game regular season in two Conferences (split into Divisions if >20 teams at the level). Standings: WIN = 2 points, TIE = 1, LOSS = 0. Everyone plays at least 9 games (8 + a playoff or matchup game in week 9) — except at levels with an odd number of teams, where a weekly bye exists; the week-9 bye goes to a team that hasn't already had one. Non-counting games (bye-balancing) don't affect standings but CAN be used for tiebreakers.",
    text: "There will be two Conferences at each level, each with one Division (20 or fewer teams) or two Divisions (more than 20 teams). Teams play a round robin schedule of eight regular season games. For win/loss record placement purposes games count as follows: 2 points for a win, 1 point for a tie, no points for a loss. ALL TEAMS will play at least nine (9) games — eight regular season games and at least one playoff game or consolation game — except at those levels for which there are an odd number of teams thus creating a weekly bye. In the latter case, there will necessarily be a team with a bye in week 9, but it will not be a team that has already had a bye. Non-counting games will be identified and noted on the schedule at the start of the season; while they do not count in the standings, they can be used for tie-breaker purposes.",
    keywords: ["standings", "points for win", "how many games", "conference", "division", "schedule", "season format"]
  },
  {
    id: "II-14-c", cite: "Part II §14.c", category: "playoffs",
    title: "Can't field a team? Forfeit notice deadlines",
    levels: ["all"],
    answer: "If you can't field a team for a scheduled game, give notice on the SUNDAY before the game so options can be considered; final decision by WEDNESDAY before the game.",
    text: "If a team is unable to field a team for a scheduled game, that team shall give ample notice so that other options may be considered. Advanced notice of the potential forfeiture shall be given on the Sunday prior to the game and final decision shall be made by Wednesday before the game.",
    keywords: ["forfeit", "cant field team", "not enough players", "cancel game", "notice deadline"]
  },
  {
    id: "II-14-d", cite: "Part II §14.d", category: "playoffs",
    title: "Playoff structure: Gold, Silver, Consolation",
    levels: ["all"],
    answer: "Playoffs and matchup games start week 9. GOLD: top 4 per Conference (by record; with two Divisions, division winners seed #1–2) → quarterfinal, semifinal, championship (bracket in Appendix C). SILVER: next 2 teams per Conference → semifinal (week 9), championship (week 10). Everyone else gets a CONSOLATION matchup with a similar-record team — every attempt is made to avoid a rematch. Quarterfinals aim for the high seed's home field; semis and championships at Council-designated fields.",
    text: "At each playing level, the playoffs and match-up games will start in week nine. Gold Tournament: the top four teams from each Conference make the Gold playoffs, progressing through a quarter final, semi-final and final per Appendix C (with two Divisions per Conference, the top team in each Division is seeded #1 and #2, next two by record are #3 and #4). Silver Tournament: the next two teams with best win/loss record in each Conference play a semi-final (week 9, conference teams play each other) and the winners play for the Silver Championship (week 10). Consolation: all remaining teams are paired with teams of similar win/loss records for one additional game in week nine, avoiding rematches where possible. Quarter final games are scheduled on the highest seed's home field as best as possible; semi-finals and Championship games are played at predetermined fields decided by the Council.",
    keywords: ["playoffs", "gold tournament", "silver tournament", "consolation", "bracket", "who makes playoffs", "week 9", "seeding"]
  },
  {
    id: "II-14-e", cite: "Part II §14.e", category: "playoffs",
    title: "Breaking standings ties for seeding",
    levels: ["all"],
    answer: "Tied records seed by: (1) head-to-head result; (2) if that doesn't settle it, a coin toss (GEJFA scheduler + President) — EXCEPT a tie for the LAST playoff spot uses the on-field shootout format (held by the Tuesday after the last regular-season game). A team may also voluntarily take the lower seed. In a three-way tie, the two remaining teams are seeded first by head-to-head record, then by coin toss.",
    text: "Entering the playoffs, teams will be seeded according to their total won/loss record points. If two or more teams are tied: if the teams have played during the season, the head-to-head record will be used to seed the teams. If the tied teams have not played or the record does not clarify seeding, a coin toss (between the GEJFA scheduler and the GEJFA President) or similar chance method shall be used; however, if the tie is for the last playoff position, then a tie-breaker (shootout) format will be used. Ties may also be broken by a team electing the lower seeding. In the case of a three way tie, the seeding of the two remaining teams shall be determined first by the head-to-head record and then by a coin toss (between the GEJFA scheduler and the GEJFA President) or similar chance method. If a shootout is required, it will be held on or before the Tuesday following the last scheduled regular season game.",
    keywords: ["head to head", "seeding tie", "coin flip seed", "last playoff spot", "tied record"]
  },
  {
    id: "II-14-f", cite: "Part II §14.f–g", category: "playoffs",
    title: "Extra games and non-GEJFA opponents",
    levels: ["all"],
    answer: "Two GEJFA teams may agree to play, make field arrangements, and notify the President and scheduler — the Club Director must notify the scheduler by 6 PM on the Sunday before the game. Playing a NON-GEJFA team: the Club Director must review the opponent's roster (birth dates + weights) to confirm no players exceed GEJFA formula point totals. Bye-week inter-league or practice games are allowed subject to Council review.",
    text: "No other match up games will be scheduled, unless two GEJFA teams agree to play, make field arrangements and notify the President and scheduler. Make sure your Club Director notifies the scheduler prior to 6pm on Sunday prior to the game. If a GEJFA team arranges to play a non GEJFA team, the Club Director must review the opponent's roster (with birth dates and weights) to make sure they don't have players over our formula point totals. Any proposed post season activity will be evaluated by each Club and is subject to review by the GEJFA Council. Inter-league games, subject to review by the GEJFA Council, or practice games are allowed during the season on weeks when a team has a bye.",
    keywords: ["scrimmage another team", "outside league", "extra game", "interleague", "arrange game"]
  },

  // ============ PART I — ORGANIZATION (coach-relevant) ============

  {
    id: "I-4", cite: "Part I §4", category: "discipline",
    title: "Ethics: alcohol, tobacco, profanity",
    levels: ["all"],
    answer: "No alcohol at practices or games. Profanity and tobacco are out of place. No drugs for players or coaches without a physician's advice. Violations range from warning → suspension → forfeiture → dismissal from the program.",
    text: "The use of alcohol during practices or games is prohibited. Profanity and tobacco products are also out of place. Drugs of any kind are not to be used by any player or coach without the advice of a physician. Rule infractions or conduct contrary to ethical standards can and will result in penalties: from a warning, a suspension, to forfeiture of a game, to dismissal from the program. All coaches shall acknowledge the 'Coaches Code of Conduct'; use of a 'Parent Code of Conduct' within each Club is also required.",
    keywords: ["alcohol", "drinking", "tobacco", "vaping", "swearing", "profanity", "code of conduct", "ethics"]
  },
  {
    id: "I-7-a", cite: "Part I §7.a", category: "eligibility",
    title: "Player eligibility basics",
    levels: ["all"],
    answer: "New players go to the club whose boundaries they live in (exceptions need Grievance Committee approval). Birth certificate (or official document) required as proof of birth date. A player may NOT also play school football (middle/junior/senior high) the same fall — GEJFA registration isn't valid while playing another same-season program; they may join after leaving that program if within the registration deadline.",
    text: "Each player new to GEJFA football will be assigned to the appropriate franchised Club based on boundaries wherein he/she resides. All exceptions must be approved by the GEJFA Grievance Committee. All players are required to submit a birth certificate, or other official document, as proof of birth date. Must not be a player participant for any other football program (e.g., middle school, junior high or senior high school football team) during the same fall season. A player no longer playing in any other football program may be added subject to meeting the registration deadline established by GEJFA Council. Clubs shall give written notice to Council via the President whenever a player is terminated from their program for cause.",
    keywords: ["eligibility", "birth certificate", "school football", "middle school team", "boundaries", "two teams", "register"]
  },
  {
    id: "I-7-b", cite: "Part I §7.b", category: "eligibility",
    title: "Transfers between clubs",
    levels: ["all"],
    answer: "INTERNAL: a kid attending a public school inside a club's boundaries may play for that club regardless of home address — needs both clubs' approval + Council (Grievance) sign-off, renewed annually. EXTERNAL (lives outside all GEJFA boundaries): may join any club with club + Council approval — max 2 external transfers per level and 5 total per club, renewed annually. If a club fields no team at a level, its players at that level may move to a neighboring club without player-specific approval (current year only). Until June 30, clubs must accommodate their own resident applicants before taking transfers.",
    text: "Internal Transfers: A child who attends a public school within a Club's boundaries is eligible to play for that club regardless of his/her primary residence. Such transfers must first have the approval of the two involved Clubs and are subject to final approval by the Council. Good only for the current year, renewed annually. External Transfers: A player who resides outside the boundaries of all franchised Clubs may play for any GEJFA Club subject to approval by the Club and then by the Council. No Club shall accept more than two external transfers per level and no more than five total external transfers. When a franchised Club is not fielding a team at a level, any players at that level within its boundaries may transfer to a neighboring Club without player specific approval (current year only). Until June 30, franchised Clubs must first accommodate all player applicants who reside within their boundaries before taking transfers.",
    keywords: ["transfer", "different club", "out of boundary", "school attends", "external transfer", "moved"]
  },
  {
    id: "I-7-c", cite: "Part I §7.c", category: "eligibility",
    title: "Level assignment, playing up, no playing down",
    levels: ["all"],
    answer: "Five levels, assigned by age OR by Age-Weight point total (see the current Age/Weight Chart). Ninth graders with more than 67 age points may only play by Age-Weight. Playing UP: must be within 5 points of the higher level's minimum, with a parent-signed waiver/release approved by the club. Age-points-only can let a smaller kid play with age peers (club discretion + waiver). Playing DOWN below your chart level: NEVER allowed.",
    text: "Players will be assigned to one of five separate levels of play as determined by either their age or by the Age-Weight point total. See the current GEJFA Age/Weight Chart for details. Ninth graders with more than 67 age points are only permitted to play by Age-Weight point total. A player wishing to play at a level higher than that determined by the Age-Weight point total must be within five (5) points of the minimum point total of the higher level and have a waiver and release of liability signed by his parents and approved by the Club. The Age Points Only option could allow a player to play up with his/her peers even though he/she might be much smaller; this is permitted at the discretion of the Club and is subject to a waiver. No player may be wavered down to a level below that for which he is eligible based on the Age-Weight Chart, using either option.",
    keywords: ["play up", "play down", "level assignment", "age weight", "waiver level", "which level", "age points"]
  },
  {
    id: "I-7-d", cite: "Part I §7.d", category: "eligibility",
    title: "Roster sizes and team splits",
    levels: ["all"],
    answer: "Recommended 22+ per team. Single team at Soph/JV/Varsity: 14–33 players (Varsity: 20+ strongly encouraged). 8-player levels: 11–21. Teams must accept up to 26 players (21 at 8-player) in application order before turning anyone away; registration may close after June 30. Split thresholds (min/max before splitting): Rookie 11/21 · Cub 16/31 · Soph 17/33 · JV 18/35 · Varsity 20/35. Splits must be EQUAL (numbers/skill/size/age — geographic split by school boundary qualifies) and Council-approved before implementation.",
    text: "The GEJFA Council recommends at least 22 players per team. Single team at Sophomore, Junior Varsity or Varsity: minimum 14, maximum 33 (unless exceptions approved). At Varsity, a minimum squad size of twenty (20) is strongly encouraged. At 8 Player Football levels the minimum is 11 rostered players and the maximum is 21. Each team must take up to 26 (21 at 8 Player levels) players in order of application before being considered full. Franchised Clubs may close registration after June 30 without regard to number of players and may do so earlier when approved by vote of the JFC. A Club may divide ('split') a team when the roster exceeds the division's maximum: Rookie 11–21, Cub 16–31, Sophomore 17–33, Junior Varsity 18–35, Varsity 20–35 (Varsity may result in sending 4 players to another Club). 'Equal' means parity of numbers, skill, size, age, etc.; a geographic split by school boundaries satisfies equity. Split method must be approved by the GEJFA Council prior to implementation; splits at multiple levels must be done in a like manner.",
    keywords: ["roster size", "squad limit", "split team", "max players", "min players", "too many kids", "waiting list"]
  },
  {
    id: "I-8", cite: "Part I §8", category: "game-day",
    title: "Coach requirements: training, game reports, limits",
    levels: ["all"],
    answer: "All coaches need training (GEJFA rules, equipment fitting, concussion, sudden cardiac arrest, heat illness; 1st aid for at least one coach per team). Game reports are due by MIDNIGHT Saturday for EVERY game (including opposing players out for injury/absence/discipline) — miss it and the head coach is AUTOMATICALLY suspended for the next game. No coach may coach two teams at the same level. Max 8 coaches on the roster/sideline.",
    text: "All coaches, head and assistant, shall receive training in: GEJFA Rules, equipment fitting, concussion awareness and procedures, Sudden Cardiac Arrest awareness and procedures, Heat Illness Prevention, First Aid (at least one coach per team). Each head coach is responsible for: conduct of himself, assistants, players and parents; attendance at league meetings/clinics; reporting all injuries and insurance claims; submitting game reports by 12:00pm (midnight) on the day of the game — game reports include all opposing players not participating due to injury, absence or discipline, and are required for every game including playoff and matchup games (failure to submit = automatic head coach suspension for the next scheduled game); ensuring all players meet eligibility requirements; submitting Code of Conduct and Background Check forms before the season. No coach may coach two teams at the same level. Up to eight coaches may be listed on the roster and be on the sideline in games; additional trained coaches may participate in practices.",
    keywords: ["game report", "midnight deadline", "coach training", "concussion training", "background check", "how many coaches", "eight coaches", "report injuries"]
  },
  {
    id: "I-9-abc", cite: "Part I §9.a–e", category: "practice",
    title: "Practice limits: how many, how long",
    levels: ["all"],
    answer: "No practice before the Council's start date (generally Aug 1). Max ONE practice a day, FIVE per week (Sun–Sat), and no more than 15 total before Labor Day. After the Council's cutoff (generally Labor Day weekend): max THREE per week. Every session — including warm-ups and chalk talk — caps at TWO HOURS, strictly.",
    text: "There shall be no organized practice sessions prior to the first day of practice established by the GEJFA Council; generally the first day of August. A week is defined as starting on Sunday and ending on Saturday. One practice may be held per day with a maximum of five (5) practice sessions in a week provided there shall be no more than fifteen (15) practice sessions preceding Labor Day. After a date established by the Council (generally Labor Day weekend), teams will be limited to three (3) practices per week. Practice sessions, including warm-up time and any other instruction ('chalk talk', etc.), may last no more than two (2) hours. Strict adherence to the two-hour limitation is required.",
    keywords: ["practice limit", "how many practices", "two hours", "labor day", "practice schedule", "five per week", "three per week"]
  },
  {
    id: "I-9-fgh", cite: "Part I §9.f–i", category: "practice",
    title: "Jamborees, contact progression, what counts as practice",
    levels: ["all"],
    answer: "One jamboree is a FREE extra practice; any additional jamboree/scrimmage counts against that week's allowance. Contact progression: 2 non-collision practices in equipment BEFORE any collision contact, then 3 collision practices BEFORE playing a game. All team meetings/film count as practice (one preseason parent/concussion meeting is exempt). Coaches never take part in scrimmage action.",
    text: "Each team may participate in one Jamboree as an extra practice. Any additional Jamboree, or other scrimmage, shall be counted as one of the allowed practices that week. A jamboree is any scrimmage event involving two or more teams of two different Clubs. Players may not engage in collision contact activities until they have attended two (2) non-collision contact practices outfitted in their practice equipment. Players must then participate in three (3) collision contact practices before participating in a game. All team meetings including skill sessions, movies, etc., shall constitute practice, except one preseason team meeting with players and parents for concussion training and organizational matters. Coaches (any non-player) are not to take part in either scrimmages or scrimmage type action.",
    keywords: ["jamboree", "scrimmage", "contact progression", "acclimatization", "new player contact", "film session counts", "meetings count"]
  },
  {
    id: "I-9-jk", cite: "Part I §9.j–k", category: "practice",
    title: "Contact restrictions: overweight players & mixed levels",
    levels: ["all"],
    answer: "A player more than 5 pounds (5 age/weight points) over his level's upper limit (when assigned by age-weight) may NOT have collision contact with players at that level — even in practice or a jamboree. Teams at DIFFERENT levels never have collision contact with each other.",
    text: "A player who is more than five pounds (five total age/weight points) over the upper limit for the level of play to which he/she is assigned, when assigned by age and weight, shall not have collision contact with other players at that level, even in practice (including a jamboree). Teams at different levels will not have collision contact between each other (i.e., Cubs vs. Rookies, etc.).",
    keywords: ["overweight practice", "5 pounds over", "levels scrimmage each other", "cubs vs rookies", "practice contact heavy"]
  },
  {
    id: "APP-A", cite: "Appendix A", category: "discipline",
    title: "Progressive discipline points for clubs",
    levels: ["all"],
    answer: "Confirmed violations earn a club points: Health/Safety/Ethics 1–4 · Rules 1–3 · Administrative 1–2 (individuals involved can also be suspended). Points accumulate over a season: 4 points = the club appears before the Grievance Committee; 8 points = recommended sanctions (playoff disqualification, probation, etc.). Some violations carry automatic one-game suspensions (player/coach ejection, 2nd+ late game report); some carry automatic forfeiture after review (altered rosters / illegal player, no approved game roster).",
    text: "Violations are classified into: (1) Health, Safety and Ethics (1–4 points), (2) Rules (1–3 points), (3) Administrative Requirements (1–2 points), issued to the club by the Grievance Committee based on severity; involved individuals are also subject to penalty such as suspension. Points are cumulative. At 4 total points in a season, the club must appear before the Grievance Committee. At 8 points, the Committee will recommend sanctions to the council that may include playoff disqualification, probation, etc. Certain violations carry an automatic one game suspension without further review (e.g., player ejection unless appealed per Appendix B, coach ejection, late game report — 2nd and subsequent violations, as the 1st equals club probation). With the exception of a player ejection, these also require appearance before the Grievance Committee before returning to coaching. Certain violations, after review, carry automatic game forfeiture: altered game rosters (playing an illegal player), failure to produce an approved game roster.",
    keywords: ["discipline points", "club points", "progressive discipline", "sanctions", "late report penalty", "altered roster"]
  },
  {
    id: "I-5", cite: "Part I §5–6", category: "eligibility",
    title: "League structure: clubs, JFC, Grievance Committee",
    levels: ["all"],
    answer: "GEJFA is made of independent franchised clubs (aligned to public HS boundaries), governed by the Junior Football Council (one vote per club). The Grievance Committee (3+ members, President-appointed) reviews ejections, protests, and violations; on coach ejections its decision is final unless appealed to the JFC. Rule amendments need a 2/3 vote of clubs, proposed in writing 2 weeks ahead.",
    text: "GEJFA is composed of the various independent franchised football Clubs voted into membership, directed through the Junior Football Council (JFC). In JFC voting, each franchised Club has one vote. There shall be a standing Grievance Committee of at least three Council members appointed by the President and approved by the JFC; a member is replaced when a case involves a team from that member's Club or there is a conflict of interest. The committee reviews all coach ejections and other matters as directed; on coach ejection, the committee's decisions are final unless appealed to the JFC. The rules and regulations may be amended by at least a two-thirds vote of the total membership of the JFC, with proposals submitted in writing at least two weeks before the meeting.",
    keywords: ["grievance committee", "jfc", "council", "who decides", "league structure", "amend rules"]
  },

];

