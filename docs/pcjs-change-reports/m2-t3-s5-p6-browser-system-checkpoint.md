# M2 T3 S5 P6 PCjs Change Report: Browser System-Port Checkpoint

## Summary

- Affected PCjs-derived subsystem: reset-state observation for PC/AT system
  port, PIT2 gate, speaker signal, and A20 relation.
- Changed product behavior: adds browser presentation of project-native reset
  signals only.

## Basis

- PCjs defines the selected system-port, timer-2/speaker, and A20/reset signal
  relations. The browser renders local TypeScript state without PCjs runtime.

## Boundary

- No PCjs import, host audio, keyboard protocol, firmware, storage, media,
  display, DOS, or guest-service behavior is added.

## Verification

- Manual local-browser inspection verified reset values before and after Reset,
  with no warning or error in the browser console.
