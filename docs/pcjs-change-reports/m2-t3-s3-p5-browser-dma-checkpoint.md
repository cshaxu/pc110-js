# M2 T3 S3 P5 PCjs Change Report: Browser DMA Checkpoint

## Summary

- Affected PCjs-derived subsystem: none at runtime.
- Changed product behavior: browser presentation of local DMA reset masks.

## Basis

- T3 S3 requires browser-visible project-owned hardware evidence without a
  PCjs device, requesting device, storage path, or host-time substitute.

## Boundary And Verification

- The browser reads only local rebuilt-core DMA snapshots.
- Focused tests and manual inspection verify reset-mask state and Reset.

## Future Path

- T4 may provide a real FDC endpoint through the established DMA interface.
