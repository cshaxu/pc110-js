# M2 T3 S5 P2 PCjs Change Report: System-Port State

## Summary

- Affected PCjs-derived subsystem: generic PC/AT PPI_B/8042 RWREG shared state.
- Changed product behavior: adds an isolated project-native timer-2/speaker,
  refresh, and parity/I/O-check state model.

## Basis

- PCjs defines the common low-bit timer-2/speaker controls and the selected
  refresh and parity/I/O-check relations at `0x61`.

## Boundary

- The local model has no PCjs import, port registration, PIT wiring, host audio,
  keyboard controller, DeskPro error line, NMI, reset, A20, firmware, storage,
  media, or guest-service behavior.

## Verification

- Focused tests cover independent timer-2/speaker gates, refresh observation,
  parity/I/O-check controls, and deterministic reset state.
