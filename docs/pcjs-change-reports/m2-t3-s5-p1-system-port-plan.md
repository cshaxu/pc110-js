# M2 T3 S5 P1 PCjs Change Report: System-Port Plan

## Summary

- Affected PCjs-derived subsystem: PC/AT system port, NMI, reset, and A20 glue.
- Changed product behavior: none; this part records a project-native plan.

## Basis

- PCjs defines the selected `0x61`, RTC NMI-mask, 8042 output-port A20/reset,
  and model-specific boundaries.

## Boundary

- Future TypeScript code will model actual selected signal ownership without
  PCjs imports, a synthetic port `0x92`, host audio, firmware, storage, or
  guest-service behavior.

## Future Path

- Executable parts will add local system-port state, NMI/reset/A20 composition,
  the narrow S6 8042 contract, and a truthful browser checkpoint.
