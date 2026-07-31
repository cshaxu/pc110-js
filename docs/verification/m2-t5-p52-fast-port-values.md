# M2 T5 P52 Verification

- A 1,000-instruction Fast smoke trace with port tail two records
  `write 03d9/8 30` and `write 0084/8 12`.
- The output remains bounded and contains no instruction snapshots.
- Full gate passed: format, build, lint, tests, and `git diff --check`.
