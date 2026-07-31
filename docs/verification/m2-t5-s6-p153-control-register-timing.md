# M2 T5 S6 P153 Control-Register Timing Verification

## Focused Checks

- Valid `0F 20` CR0/CR2/CR3 transfers charge six cycles even with a non-register
  MOD field.
- Valid `0F 22` writes preserve distinct CR0, CR2, and CR3 timing classes.
- A cold same-media browser search crosses the former `F000:879C`
  `MOV EAX,CR0` boundary with matching cycles. Its next first timing difference
  is `F000:87A5` (`FF /5` memory far jump): native two cycles, PCjs 30 cycles.

## Boundary

This changes only generic 80386 control-register scheduling. It does not add
firmware behavior, synthetic device state, or a DOS-boot claim.
