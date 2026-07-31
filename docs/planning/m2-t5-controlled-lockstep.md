# M2 T5 Controlled Lockstep

## Objective

Provide a diagnostic-only coordinator that advances the project-native machine
and a local PCjs `pc110`-branch reference from equivalent state by explicit
virtual work. It must stop at the first observable difference and retain a
small before/after event window.

## Authority And Boundaries

- PCjs is the high-priority behavioral comparison authority for M2 observable
  machine behavior; the standalone emulator keeps project-native TypeScript
  structure, device boundaries, and runtime ownership.
- The coordinator, PCjs control plane, and normalized snapshots are diagnostic
  tooling only. Product builds and the normal browser path import neither PCjs
  code nor diagnostic adapters.
- PCjs changes are allowed only in the local `pc110` branch and require a
  one-page change report before implementation.
- NXVM remains a CPU semantic and structural reference only. It is not a
  whole-machine oracle and supplies no platform, BIOS, POST, or guest-service
  behavior.
- No host-time synchronization, timer forcing, IRQ injection, BIOS/DOS
  response, or device shortcut is permitted.

## Required Control Contract

The opt-in PCjs control plane must expose, without changing normal execution:

1. reset and pause state;
2. one decoded-instruction stepping, including prefixes, plus an explicit
   bounded virtual-cycle operation where PCjs can provide one honestly;
3. PCjs virtual cycle count and the cycles consumed by the latest operation;
4. a versioned normalized diagnostic snapshot;
5. bounded I/O, interrupt, exception, and device-event journals; and
6. deterministic replay identity consisting of PCjs source revision, machine
   configuration, ROM/media hashes, and control-contract version.

The native side must expose equivalent operations from its own checkpoint and
device boundaries. Snapshot comparison must cover applicable CPU registers,
flags, segment selectors and hidden state, control/debug state, changed memory,
I/O, IRQ/NMI/exception state, timer phase, and selected device state. A field
may be excluded only through the central compatibility-exception ledger with
an authority, rationale, and activation condition.

## Rollout

1. Add only a paused PCjs diagnostic control surface and prove that one call
   executes one decoded instruction and advances PCjs timers consistently.
2. Add the native normalized CPU and cycle snapshot endpoint, then add matching
   PCjs CPU, cycle, and I/O snapshots. Compare established CPU fields through a
   project-owned first-difference comparator before wiring browser sampling.
3. Add the smallest selected-device snapshot adapters needed for the actual
   whole-machine blocker, beginning with PIC, PIT, DMA, 8042, and RTC.
4. Start reset-to-checkpoint selected-ROM windows only after both sides prove
   equivalent at the chosen entry boundary.
5. On the first mismatch, stop, retain the preceding bounded window, and run
   one deterministic short replay. Resolve against PCjs behavior or record a
   scoped exception; do not continue past an unexplained difference.

## Verification

- Focused control-plane tests must prove pause, reset, single-instruction
  boundary, cycle accounting, snapshot shape, and no execution when disabled.
- Every new comparison case must exercise the native machine and PCjs control
  plane from separate but equivalent state and report the first difference.
- Run the full PC110JS gate and PCjs branch-specific validation for each part.
- A browser check may display both machines, but it is not itself lockstep
  evidence; the coordinator result is authoritative.

## Stop Conditions

Stop and request owner direction if PCjs cannot provide an honest
instruction-boundary operation with its timer update semantics, if equivalent
entry state cannot be established without mutating either machine, or if an
unexplained mismatch remains after one bounded deterministic replay.
