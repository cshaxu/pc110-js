# M2 T3 S4 RTC/CMOS Evidence

## Claim

The selected PC/AT contract uses an MC146818-compatible RTC/CMOS address port
at `0x70`, data port at `0x71`, and RTC interrupt delivery through IRQ8.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js`, CMOS constants and port handlers at
  the documented `0x70`/`0x71` definitions, RTC update path, and IRQ.RTC
  definition.
- Reproduction: inspect those constants and handlers alongside focused
  project-native RTC/CMOS component and port/PIC tests.

## Accepted Boundary

The initial model is deterministic and driven by explicit emulated time. It
does not obtain time from the host, emulate NMI delivery, or invent BIOS, DOS,
storage, or PC110 behavior.

## Competing Explanations

PCjs combines RTC state with broader chipset initialization and has
model-specific ROM-test accommodations. Those behaviors are excluded until the
selected-machine contract and standalone tests establish a specific need.

## Regression Target

Each executable part will add focused state, port, clock-event, IRQ8, and
selected-configuration coverage while preserving the native PIC/PIT/DMA
checkpoint.
