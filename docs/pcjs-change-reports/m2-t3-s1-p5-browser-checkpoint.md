# M2 T3 S1 P5 PCjs Change Report: Browser PIC Checkpoint

## Summary

- Affected PCjs-derived subsystem: none at runtime.
- Changed product behavior: browser presentation of project-native reset state.

## Basis

- M2 T3 S1 requires browser-visible evidence from the project-owned hardware
  path without using a PCjs device or browser runtime.

## Boundary And Verification

- The browser creates local physical memory and the rebuilt PC/AT core only.
- Focused tests and manual browser inspection verify the CPU and PIC reset
  snapshot. No protected media or guest execution is loaded or claimed.

## Future Path

- Later native devices may extend this truthful status surface with actual
  machine traces and workload evidence.
