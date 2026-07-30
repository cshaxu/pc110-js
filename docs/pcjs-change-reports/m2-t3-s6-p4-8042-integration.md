# M2 T3 S6 P4 PCjs Change Report: 8042 Integration Evidence

## Summary

- Affected PCjs-derived subsystem: selected PC/AT controller output-buffer,
  keyboard IRQ, self-test, and output-port integration.
- Changed product behavior: strengthens project-native machine integration
  coverage; no synthetic device response is introduced.

## Basis

- PCjs establishes that keyboard data uses the controller output buffer and
  IRQ1 boundary, while self-test restores selected output-port reset/A20 state.

## Result

- The rebuilt machine verifies raw-byte IRQ1, data consumption, A20 output-port
  writes, and self-test response/reset state. The selected-ROM trace still
  stops at an unrelated unclaimed `0x84` write, so S6 does not claim firmware
  progress or add an unsupported reply.

## Boundary

- Browser input, scan-code translation, firmware, storage, display, DOS, and
  PC110 behavior remain outside P4.
