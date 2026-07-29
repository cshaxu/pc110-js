# M2 T2 S5 Port Bus Provenance

## Identity

- Subsystem: project-owned 8-bit I/O port dispatch and trace boundary.
- Migration milestone, task, and subtask: M2 T2 S5 P1.
- Source repository and commit: PCjs at
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source license: MIT.

## Paths

- Source path: `machines/pcx86/modules/v2/bus.js`.
- Destination paths: `src/devices/io-port-bus.ts` and focused tests.
- Runtime dependency closure: none.
- Excluded content: PCjs runtime JavaScript, component lifecycle, debugger
  hooks, browser code, and device implementations.

## Migration

- Imported behavior: distinct registered input and output handler ownership for
  16-bit I/O port addresses.
- Mechanical adaptation: project-native typed range registration and optional
  structured trace events replace PCjs component binding and notification
  tables.
- Intentional behavior change: unmapped access fails explicitly until the
  selected machine's chipset defines its observed behavior; no floating-bus
  value is guessed.
- Incomplete behavior: width-specific dispatch, reset wiring, and concrete
  devices remain later S5 and T3 work.

## Verification

- Focused tests: range dispatch, byte normalization, independent read/write
  ownership, overlap rejection, unmapped failure, and trace events.
- M1 reference comparison: registration and directional-dispatch structure is
  compared to the pinned PCjs bus source.
- Known differences: unmapped-port behavior is deliberately not yet modeled.
