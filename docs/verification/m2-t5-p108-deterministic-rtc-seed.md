# M2 T5 P108 Verification

- Focused configuration coverage verifies the fixed ISO value and matching
  native date/time fields.
- Reference-asset coverage verifies diagnostic machine XML contains the PCjs
  `dateRTC` parameter.
- Native-core coverage verifies machine configuration reaches the RTC through
  its normal constructor path.
- Full npm format, build, lint, test, and `git diff --check` gate passes.
