# M2 T5 P109 Verification

- Focused DeskPro-memory and browser-checkpoint tests assert `0xE0000` reads
  as zero and ignored writes do not synthesize memory.
- The controlled browser reset boundary remains equal before instruction replay.
- A clean same-media browser replay reset at an equal boundary, crossed the
  formerly divergent `F000:F94F` comparison, and reached the next first
  difference at `F000:F968`. The new boundary is outside this part's scope.
- Full npm format, build, lint, test, and `git diff --check` gate is required
  before this part is committed.
