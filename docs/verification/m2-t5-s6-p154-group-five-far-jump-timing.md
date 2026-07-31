# M2 T5 S6 P154 Group Five Far-Jump Timing Verification

## Focused Checks

- The estimator charges valid memory `FF /5` as 30 cycles.
- Existing far-control execution tests retain the project-native target and
  selector validation boundary.
- A cold same-media browser search crosses the former `F000:87A5` far-jump
  boundary with matching cycles. Its next first timing difference is
  `0018:87AD`: native two cycles, PCjs 17 cycles.

## Boundary

This changes only generic Group Five scheduling. It does not add firmware,
device, or DOS shortcut behavior.
