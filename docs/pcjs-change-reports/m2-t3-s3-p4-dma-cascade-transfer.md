# M2 T3 S3 P4 PCjs Change Report: DMA Cascade And Transfer

## Summary

- Affected PCjs-derived subsystem: PC/AT DMA0 through DMA1 channel-4 cascade.
- Changed product behavior: project-native cascade arbitration and generic
  explicit transfer adapter only.

## Basis

- PCjs documents DMA1 channel 4 as the PC/AT DMA0 cascade boundary.

## Boundary And Verification

- The implementation uses local DMA state and caller-provided memory/endpoint
  interfaces without PCjs, FDC, storage, firmware, media, or host timers.
- Focused tests cover cascade state preservation and explicit data movement.

## Future Path

- T4 may provide an FDC endpoint through this generic interface.
