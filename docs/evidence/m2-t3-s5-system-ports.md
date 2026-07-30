# M2 T3 S5 System-Port Evidence

## Claim

The selected PC/AT contract uses `0x61` for system speaker/parity-related state,
`0x70` address bit 7 for NMI masking, and the 8042 output-port relation for A20
and reset control.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js`, PPI_B/C8042 definitions, CMOS address
  handlers, NMI handlers, and 8042 output-port reset/A20 handlers.
- Reproduction: inspect those definitions beside focused project-native system
  port, NMI, reset, and A20 tests.

## Accepted Boundary

The generic implementation models only source-established PC/AT signals. It
does not add port `0x92`, host audio, BIOS/DOS behavior, DeskPro-only NMI lines,
or PC110 behavior.

## Regression Target

Each executable part will preserve native RTC, PIT, physical-memory, CPU, and
browser checkpoint behavior while adding focused signal and reset evidence.
