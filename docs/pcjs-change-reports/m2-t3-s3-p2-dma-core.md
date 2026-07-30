# M2 T3 S3 P2 PCjs Change Report: DMA Controller Core

## Summary

- Affected PCjs-derived subsystem: 8237 controller register and transfer state.
- Changed product behavior: project-native standalone controller state only.

## Basis

- PCjs documents the selected PC/AT 8237 ports, flip-flop, controller status,
  masks, request, mode, and page-address contract.

## Boundary And Verification

- The TypeScript state model contains no PCjs import, port bus, memory bus,
  FDC, firmware, media, or host timer.
- Focused tests verify register sequencing, arbitration, and transfer state.

## Future Path

- P3 registers dual controllers and page registers through the native port bus.
