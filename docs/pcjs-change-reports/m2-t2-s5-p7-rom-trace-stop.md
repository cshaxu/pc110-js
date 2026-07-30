# M2 T2 S5 P7 PCjs Change Report: Rebuilt ROM Trace Stop

## Summary

- Affected PCjs-derived subsystem: selected ROM execution trace boundary.
- Changed behavior: the trace uses the rebuilt machine core and records a
  structured stop for unmapped project-native ports.

## Justification

- S5 must classify the next missing device boundary without returning a
  fabricated port value or using a PCjs runtime device.

## Verification

- Focused tests cover halt and unmapped-port stop events.
- The selected-ROM trace reports the exact unclaimed port after the completed
  instruction count.
- The full project gate remains required before commit.
