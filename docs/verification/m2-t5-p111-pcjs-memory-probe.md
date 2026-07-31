# M2 T5 P111 Verification

- A fresh same-origin diagnostic page reported direct PCjs values `C8000=FF`
  and `E0000=00`.
- Three paused normal-machine resets retained those same two values and each
  reset boundary remained equal to the native machine's established reset
  snapshot.
- The PC110JS reference-asset test requires the physical-memory probe marker;
  the full npm format, build, lint, test, and `git diff --check` gate covers
  the project-side contract.
