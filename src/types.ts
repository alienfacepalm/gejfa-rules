/** Shared data-shape contracts for the GEJFA rules app.
 *  Pure types — no runtime code, no DOM. This is the "escape hatch" contract
 *  a future native port (Capacitor / React Native) would implement against. */

export type LevelId = "rookie" | "cub" | "soph" | "jv" | "varsity";
export type RuleLevels = ReadonlyArray<LevelId | "all">;

export interface Category {
  id: string;
  label: string;
}

export interface Level {
  id: LevelId;
  label: string;
}

export interface Rule {
  id: string;
  cite: string;
  category: string;
  title: string;
  levels: RuleLevels;
  /** Plain-English ruling — may simplify wording, must never alter substance. */
  answer: string;
  /** Near-verbatim rule language, sourced from the official 2025 GEJFA PDF. */
  text: string;
  keywords: string[];
}

export interface Situation {
  id: string;
  ruleId: string;
  question: string;
  answer: string;
  keywords: string[];
}

export interface QuickAnswer {
  sitId: string;
  label: string;
}

export type SynonymMap = Record<string, string[]>;

/** Map of rule id -> pre-rendered SVG markup string. */
export type DiagramMap = Record<string, string>;

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

/** A unified search result: either a rule or a coach-facing situation card. */
export interface SearchDoc {
  docId: string;
  type: "rule" | "situation";
  title: string;
  question: string;
  answer: string;
  text: string;
  keywords: string;
  category: string;
  levels: RuleLevels;
  rule?: Rule;
  situation?: Situation;
  score?: number;
}

export interface SearchFilters {
  level?: LevelId | null;
  category?: string | null;
}
