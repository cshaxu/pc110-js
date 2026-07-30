# M2 T3 S6 P5 PCjs Change Report: 8042 Browser Checkpoint

## Summary

- Affected PCjs-derived subsystem: selected PC/AT C8042 reset-state visibility.
- Changed product behavior: adds project-native browser checkpoint fields only.

## Basis

- PCjs identifies the selected controller's command byte, status, output
  buffer, and keyboard-clock state as hardware-visible controller boundaries.

## Boundary

- The browser presents reset-state observations only. It does not bind browser
  input, generate scan codes, emulate firmware, attach media, render native
  video, or claim DOS progress.
