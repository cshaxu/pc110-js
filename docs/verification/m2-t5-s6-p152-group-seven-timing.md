# M2 T5 S6 P152 Group Seven Timing Verification

## Focused Checks

- The estimator covers valid memory `SGDT`, `SIDT`, `LGDT`, `LIDT`, `SMSW`, and
  `LMSW` forms.
- The valid register `SMSW` and `LMSW` forms retain their distinct timing.
- A cold same-media browser search crosses the former `F000:8796` `LGDT`
  boundary with matching cycles. Its next first timing difference is
  `F000:879C` (`MOV EAX,CR0`): native two cycles, PCjs six cycles.

## Boundary

This changes only generic Group 7 scheduling. It does not add a firmware
workaround, synthetic device response, or DOS-boot claim.
