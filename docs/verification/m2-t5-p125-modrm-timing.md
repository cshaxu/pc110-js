# M2 T5 P125 Verification: ModR/M Timing

- Focused decoder tests cover retained ModR/M shape and non-ModR/M forms.
- Focused estimator tests cover observed register and memory timing classes.
- After a stable lockstep reset, thirteen 16-instruction browser windows reach
  `F000:BB27` with every completed CPU instruction and total virtual cycle
  count matched at 887 cycles.
- The first remaining difference is device-only: PIT0 count is native 65535
  versus PCjs 65534 at that equal-cycle boundary.
- Full npm format, build, lint, test, and `git diff --check` are required.
