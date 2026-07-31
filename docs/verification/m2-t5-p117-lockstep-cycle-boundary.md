# M2 T5 P117 Verification

- The coordinator test verifies an entry difference retains both existing
  instruction-boundary snapshots without stepping either endpoint.
- Browser replay reaches `F000:BB15` and displays native and PCjs virtual
  cycles with the PIT count difference.
- Full npm format, build, lint, test, and `git diff --check` are required
  before commit.
