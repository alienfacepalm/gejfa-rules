/* Coach-facing changelog — newest first. Shown in the "What's new" sheet
   after an update, and reachable anytime from the footer.
   Keep entries short and in plain language: what changed for the coach,
   not how. Skip invisible/internal changes (refactors, doc-only edits).
   Add one entry here whenever CACHE_VERSION is bumped in sw.js for a
   user-visible change (see SPEC.md §9). Pure data — no DOM/browser APIs. */

const GEJFA_CHANGELOG = [
  { version: "v21", date: "Aug 2026", changes: [
    "New look: black header up top, green field below with a subtle football-grid background",
    "The category button now works and looks just like the level filter",
  ] },
  { version: "v20", date: "Aug 2026", changes: [
    "Added this ‘What's new’ screen so you can see what changed",
    "You'll now see a message while an update downloads, and a confirmation once the rulebook is saved for offline use",
    "Search box is now full-width on phones",
    "You can share a link straight to a level or category filter",
  ] },
  { version: "v18", date: "Aug 2026", changes: [
    "Fixed a stray dark line that could show under the search bar",
    "Your level filter (Rookie, Cub, Sophomore, JV, Varsity) is now remembered next time you open the app",
    "Softer background texture",
  ] },
  { version: "v17", date: "Aug 2026", changes: [
    "Fixed page alignment on tablets and larger screens",
  ] },
  { version: "v12", date: "Aug 2026", changes: [
    "Added a quick way back to the home screen — tap the helmet, or the reset button",
  ] },
  { version: "v9", date: "Aug 2026", changes: [
    "Added visual diagrams for the trickier rules (field spots, brackets, timelines)",
    "Answers now show the short version first — full rule text is one tap away under ‘Advanced’",
  ] },
  { version: "v5", date: "Aug 2026", changes: [
    "Every rule was checked word-for-word against the official 2025 rulebook PDF",
    "You can now install the app to your home screen, with the choice to do it later",
  ] },
];

// Escape hatch for Node / React Native / bundlers
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GEJFA_CHANGELOG };
}
