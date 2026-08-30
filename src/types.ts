/** Shared data-shape contracts for the GEJFA rules app.
 *  Pure types — no runtime code, no DOM. This is the "escape hatch" contract
 *  a future native port (Capacitor / React Native) would implement against.
 *
 *  Naming convention: interfaces are prefixed `I`, type aliases `T`. */

export type TLevelId = "rookie" | "cub" | "soph" | "jv" | "varsity";
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
  /** Near-verbatim rule language, sourced from the official 2025 GEJFA PDF. */
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

export interface IQuickAnswer {
  sitId: string;
  label: string;
}

export type TSynonymMap = Record<string, string[]>;

/** Map of rule id -> pre-rendered SVG markup string. */
export type TDiagramMap = Record<string, string>;

export interface IChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

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
