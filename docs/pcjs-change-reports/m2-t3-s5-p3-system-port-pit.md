# M2 T3 S5 P3 PCjs Change Report: System Port And PIT2

## Summary

- Affected PCjs-derived subsystem: PC/AT `0x61` timer-2/speaker relation.
- Changed product behavior: adds project-native 8-bit port composition, PIT2
  gate control, counter-output observation, and deterministic local reset.

## Basis

- PCjs defines shared `0x61` timer-2 gate and speaker-data controls, and its
  model-specific read path exposes the timer-2 output signal.

## Boundary

- The TypeScript adapter uses no PCjs import or runtime and emits no host audio.
  It does not implement NMI, keyboard-controller behavior, A20, reset signals,
  DeskPro error lines, firmware, storage, media, or guest services.

## Verification

- Focused tests cover port width, gate propagation, counter-2 output, speaker
  signal observation, local reset, and rebuilt-machine port registration.
