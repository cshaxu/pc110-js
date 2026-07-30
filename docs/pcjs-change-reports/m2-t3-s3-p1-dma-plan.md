# M2 T3 S3 P1 PCjs Change Report: DMA Plan

## Summary

- Affected PCjs-derived subsystem: PC/AT 8237 DMA controllers and page registers.
- Changed product behavior: none; this part records a project-native plan.

## Basis

- PCjs defines the selected PC/AT DMA port and cascade contract.

## Boundary

- Future TypeScript code will model generic DMA state and explicit data movement
  without PCjs imports, PCjs model hacks, firmware, storage, or host timers.

## Future Path

- Executable parts will add focused behavior evidence and retain the FDC boundary
  until T4 provides a real hardware request source.
