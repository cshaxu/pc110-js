# M2 T3 S4 RTC/CMOS Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js` RTC/CMOS constants, port handlers,
  IRQ8 relation, and selected generic PC/AT configuration definitions.
- Product code: original TypeScript only; no PCjs device, runtime, firmware,
  media, browser resource, host-clock, or storage behavior is imported.

## Initial Scope

The local device will own CMOS register state, deterministic calendar/event
advancement, `0x70`/`0x71` access, and IRQ8 signaling. The NMI-disable bit is
an explicit output boundary for T3 S5 rather than an NMI implementation.

## P1 Plan Boundary

P1 records the selected MC146818-compatible contract before executable work.
It excludes PCjs model-specific ROM-test accommodations, host-date policy, and
any firmware or storage configuration shortcut. Future configuration bytes must
be tied to the selected M1 PC/AT contract and accompanied by focused evidence.

## P2 RTC/CMOS State Core

P2 implements a local register and calendar model using explicit emulated ticks
only. It has no port-bus, PIC, NMI, host-date, firmware, media, storage, or
PCjs dependency. The fixed default date makes focused tests deterministic;
callers may provide a test-owned initial date without consulting host time.

## P3 PC/AT Composition

P3 composes the local model with project-native port and PIC interfaces only.
The `0x70` NMI-disable bit is exposed as state for the future S5 system-port
owner; no NMI behavior is added. IRQ8 originates only after a caller advances
the local RTC, so no host-timer or PCjs scheduler dependency exists.

## P4 Selected Configuration State

P4 derives only the M1 contract's standard memory declaration: 640 KiB low RAM
and 3072 KiB extended RAM. The DeskPro RAM window, chipset wiring, ROM map,
and all unrecorded equipment details remain DeskPro-profile concerns and are
not fabricated as generic CMOS defaults.
