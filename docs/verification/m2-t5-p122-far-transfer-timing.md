# M2 T5 P122 Verification: Far Transfer Timing

- Focused estimator tests cover short jump, far jump, and far call charges.
- Full npm format, build, lint, test, and `git diff --check` are required.
- A cold browser lockstep replay must show equal cycle charges for the reset
  vector's completed `EA` far jump before investigating the next boundary.

## Browser Evidence

Cold replay completed the reset-vector `EA` far jump with native and PCjs both
reporting 11 cycles. The compared architectural boundary remained matched.
