# M2 T3 S2 P4 PCjs Change Report: Browser PIT Checkpoint

## Summary

- Affected PCjs-derived subsystem: none at runtime.
- Changed product behavior: browser presentation of native PIT reset output.

## Basis

- T3 S2 requires a browser-visible project-owned hardware checkpoint without a
  PCjs device, host timer, firmware, or audio shortcut.

## Boundary And Verification

- The browser reads only local rebuilt-core PIT snapshots.
- Focused tests and manual inspection verify reset output state and Reset.

## Future Path

- A later scheduler and T3 S5 speaker gate may expose additional real hardware
  state when their device boundaries are complete.
