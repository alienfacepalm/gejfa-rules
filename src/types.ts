/** Shared data-shape contracts for the GEJFA rules app.
 *  Pure types — no runtime code, no DOM. This is the "escape hatch" contract
 *  a future native port (Capacitor / React Native) would implement against.
 *
 *  Naming convention: interfaces are prefixed `I`, type aliases `T`. */

export type TLevelId = "rookie" | "cub" | "soph" | "jv" | "varsity";
/** Score check level options: `cub8` = Cubs at the 8-player level (Council vote, Part II §7.b); it resolves like Rookie. */
export type TFlowLevelOption = TLevelId | "cub8";
export type TRuleLevels = ReadonlyArray<TLevelId | "all">;

export interface ICategory {
  id: string;
  label: string;
}

export interface ILevel {
  id: TLevelId;
  label: string;
}

export interface IRule {
  id: string;
  cite: string;
  category: string;
  title: string;
  levels: TRuleLevels;
  /** Plain-English ruling — may simplify wording, must never alter substance. */
  answer: string;
  /** Near-verbatim rule language, sourced from the official 2026 GEJFA PDF. */
  text: string;
  keywords: string[];
}

export interface ISituation {
  id: string;
  ruleId: string;
  question: string;
  answer: string;
  keywords: string[];
}

/** A one-tap Game Time tile: opens a situation card (`sitId`) or a guided flow (`flowId`). */
export interface IQuickAnswer {
  sitId?: string;
  flowId?: string;
  label: string;
}

// ---- Guided flows (tap-through follow-up questions, no AI) ----

export type TFlowStepKind = "score" | "choice";
export type TFlowTone = "stop" | "go" | "note";

export interface IFlowOption {
  id: string;
  label: string;
}

export interface IFlowStep {
  id: string;
  kind: TFlowStepKind;
  prompt: string;
  /** Choice steps only. */
  options?: readonly IFlowOption[];
  /** Skip this step when another answer has one of these values. */
  skipWhen?: Readonly<Record<string, readonly string[]>>;
}

export interface IFlow {
  id: string;
  label: string;
  title: string;
  steps: readonly IFlowStep[];
}

/** A rule-cited line of "the call". Wording is near-verbatim rulebook text. */
export interface IFlowCallout {
  ruleId: string;
  tone: TFlowTone;
  heading: string;
  text: string;
}

export type TFlowAnswers = {
  us?: number;
  them?: number;
  lvl?: TFlowLevelOption;
  sit?: string;
  time?: string;
};

export interface IFlowRow {
  id: string;
  label: string;
  pts: number;
  /** The scoring side's lead after this score (negative = still trailing). */
  after: number;
  ok: boolean;
  flag: "over32" | "over38" | null;
  entersProtocol: boolean;
  leavesProtocol: boolean;
}

export interface IFlowTable {
  kind: "offense" | "defense";
  who: "us" | "them";
  title: string;
  rows: readonly IFlowRow[];
}

export interface IFlowResult {
  flowId: string;
  answers: TFlowAnswers;
  lead: number;
  abs: number;
  regime: "normal" | "protocol" | "over32" | "behind25";
  headroom: number | null;
  toProtocol: number | null;
  rookie: boolean;
  status: { score: string; regime: string; detail: string };
  tables: readonly IFlowTable[];
  callouts: ReadonlyArray<IFlowCallout & { id: string; cite: string; rule: IRule | null }>;
}

export type TSynonymMap = Record<string, string[]>;

/** Map of rule id -> pre-rendered SVG markup string. */
export type TDiagramMap = Record<string, string>;

/** A unified search result: either a rule or a coach-facing situation card. */
export interface ISearchDoc {
  docId: string;
  type: "rule" | "situation";
  title: string;
  question: string;
  answer: string;
  text: string;
  keywords: string;
  category: string;
  levels: TRuleLevels;
  rule?: IRule;
  situation?: ISituation;
  score?: number;
}

export interface ISearchFilters {
  level?: TLevelId | null;
  category?: string | null;
}
