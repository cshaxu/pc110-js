# M2 T3 S6 P3 PCjs Change Report: 8042 PC/AT Adapter

## Summary

- Affected PCjs-derived subsystem: selected PC/AT C8042 port dispatch,
  keyboard-input interrupt, and output-port routing.
- Changed product behavior: maps original TypeScript 8042 behavior at `0x60`
  and `0x64` and composes it with existing native contracts.

## Basis

- PCjs maps data at `0x60`, status/commands at `0x64`, routes eligible keyboard
  data through IRQ1, and relates controller output-port state to A20/reset.

## Product Decision

- The adapter raises IRQ1 only for a P2-accepted raw keyboard byte whose
  command byte allows interrupt delivery. Controller command replies do not
  produce a synthetic keyboard IRQ.

## Boundary

- The adapter keeps `0x61` S5-owned and excludes scan-code translation,
  browser input, firmware, storage, display, DOS, and PC110 behavior.
