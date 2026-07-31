# M2 T5 S6 P155 Protected Segment-Move Timing Verification

## Focused Checks

- Real-mode register and memory `MOV Sreg,r/m16` forms retain their two- and
  three-cycle timing classes.
- Protected-mode register and memory forms charge 17 and 18 cycles.
- The full quality gate passes. A cold same-media browser search crosses the
  former `0018:87AD` timing boundary and localizes the next architectural
  difference to `F000:B574`: native `EAX = 0x7fffff1c`, PCjs
  `EAX = 0x7fffff0c`.

## Boundary

This changes only generic protected-mode segment-load scheduling. It does not
add firmware, device, or DOS shortcut behavior.
