# M2 T5 P112 Verification

- The diagnostic machine XML contains `autoStart="false"` and its focused
  reference-asset test asserts that contract.
- A fresh browser reference reported paused with `C8000=FF` and `E0000=FF`
  before reset or instruction stepping.
- With verified local media mounted, the coordinator reset at an equal boundary
  and matched the first 80 controlled instruction boundaries.
- Full npm format, build, lint, test, and `git diff --check` gate is required
  before this part is committed.
