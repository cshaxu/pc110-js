# M2 T3 S5 P5 PCjs Change Report: 8042 Output Port

## Summary

- Affected PCjs-derived subsystem: selected 8042 output-port A20 and reset
  signals.
- Changed product behavior: adds an original TypeScript signal-state contract
  wired to physical memory and CPU-only reset.

## Basis

- PCjs documents output-port bit 1 as A20 and bit 0 as reset, and treats reset
  pulse handling as CPU-register reset rather than broad chipset reset.

## Boundary

- No PCjs import, 8042 I/O port, command/status/data-buffer protocol, keyboard
  behavior, firmware, storage, media, or guest-service behavior is added.

## Verification

- Focused tests verify independent A20 and reset signals, physical-memory A20
  routing, and CPU reset-vector restoration without device reset claims.
