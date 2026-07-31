# M2 T5 P113 Verification

- The focused reference-asset test asserts that the generated `<chipset>`
  element contains the fixed `dateRTC` value.
- A fresh cold controlled replay must pass the previous `F000:938A` RTC read
  boundary without host-time input before a new first difference is classified.
- Full npm format, build, lint, test, and `git diff --check` gate is required
  before this part is committed.
