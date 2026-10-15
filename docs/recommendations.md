# Recommendations

Last updated: 2026-10-15
Type: domain
Source: canonical
Update trigger: Recommendation rules, reviewed chart notes, or source policy changes
Read when: Maintaining the separate SSS+ recommendation page

## Scope

`/recommendations/` is separate from song details and catalog views. The shared
menu adds `Recommend`; existing catalogs do not gain skill panels. This first
version targets SSS+ only, meaning an achievement of at least 100.5000%.

No private Planner entries, credentials, note-by-note misses, or attempt counts
are used. Recommendations are deterministic selections, not success
probabilities or a diagnosis of the player's weaknesses. Missing records are
unknown, not proof that a chart has never been played.

## Selection Rules

- `Near target` includes valid retained scores below SSS+, ordered by the
  remaining percentage, then higher constants and a stable chart ID.
- `Similar level` includes charts without retained records. Comparisons stay
  within the same difficulty and prefer the same ST/DX format if at least three
  SSS+ clears exist. Otherwise they use that difficulty's combined ST/DX clears.
- The reference constant is the third-highest comparable SSS+ clear, limiting
  the effect of one unusually high clear. New candidates must fall within
  reference minus 0.5 through reference plus 0.2. This band is an initial
  heuristic, not a calibrated skill estimate.
- Each candidate can show the three closest comparable SSS+ records. Their
  actual format and difficulty are visible. Shared patterns are listed only
  when both exact charts have reviewed source notes.
- `Patterns` shows source-backed study charts below SSS+, including difficult
  charts outside the similar-level band. It is a study collection, not a claim
  that all listed charts are currently within reach.
- Already-achieved SSS+ charts are excluded from all target lists. Invalid
  retained achievement values are excluded rather than treated as missing.

The score format is integer percentage times 10,000: the SSS+ threshold is
`1_005_000`. AP flags and textual rank labels do not substitute for the score.
Current catalog and score snapshots are rebuilt after existing data refreshes;
there is no new polling, account connection, or direct NET importer.

## Reviewed Notes

`src/data/chart-study.js` contains 24 exact chart profiles initially reviewed on
2026-10-15. They are short original summaries of concrete pattern observations:

- [Tonevo GreeN chart notes](https://tonevoadventcalendar.hatenablog.com/entry/2023/12/24/203835), 2023-12-24.
- [BEATECH SSS+ discussion](https://beatech.hatenablog.com/entry/2024/07/15/220559), 2024-07-15.
- [maimai Wiki: Umiyuri](https://gamerch.com/maimai/533675).
- [maimai Wiki: HECATONCHEIR](https://gamerch.com/maimai/534205).

Source authors' subjective level rankings are not imported. Old articles do not
override current International constants. Community notes are not official
ratings or a complete skill database. The original articles and tables are not
mirrored; each note links to its source. An exact song title, ST/DX format, and
difficulty must match before a profile is attached. Deleted charts are skipped;
identity drift or duplicate profiles fail validation.

Unreviewed charts receive no guessed skill labels. Pattern-result counts are
limited to the reviewed subset and retained records, with no absence-based
weakness claims. DXRating tags and experimental maimai.party classifications
are not imported. New notes require an explicit source review and exact-chart
validation, not automatic propagation to other difficulties or chart formats.

## Planner Handoff

The calendar action passes an exact chart ID and `target=SSS+`. Planner opens the
existing add dialog with that chart selected, its ST/DX and difficulty filters,
and a date to confirm. It never writes until the user signs in and confirms Add.
Existing open goals remain protected by the normal duplicate checks and RLS.
OAuth redirects preserve only the validated handoff parameters; callback codes
and unrelated URL data are removed. Closing the add dialog clears the handoff.

## Verification

Run `npm test` and `npm run build`. The focused recommendation tests cover the
fixed-point threshold, missing versus invalid records, candidate bands,
same-difficulty comparisons, source identity guards, multilingual search,
pagination, OAuth cleanup, and separation from private Planner data. Browser QA
also covers mobile menu, filter reset, all modes, page-size changes, evidence,
YouTube search, and unsigned Planner prefill without saving plans.
