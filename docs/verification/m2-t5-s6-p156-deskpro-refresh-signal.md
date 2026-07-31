# M2 T5 S6 P156 DeskPro Refresh Signal Verification

## Focused Checks

- Generic PC/AT port `0x61` retains its PIT counter-1 refresh signal.
- An injected profile signal controls only bit 4 and does not alter speaker or
  timer-2 gate behavior.
- DeskPro composition exposes bit 4 when deterministic virtual cycle bit 6 is
  set, while generic composition does not acquire that profile behavior.
- The full quality gate passes. A cold same-media browser search crosses the
  former `F000:B574` port-read difference and localizes the next timing
  difference to `F000:B5B5`: native five cycles, PCjs three cycles.

## Boundary

This is a selected-machine wiring variant. It does not add a synthetic timer,
host-time input, firmware behavior, or DOS shortcut.
