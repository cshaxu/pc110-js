# M2 T3 S4 P1 PCjs Change Report: RTC/CMOS Plan

## Summary

- Affected PCjs-derived subsystem: PC/AT RTC/CMOS and IRQ8 relation.
- Changed product behavior: none; this part records a project-native plan.

## Basis

- PCjs defines the selected PC/AT `0x70`/`0x71` protocol, MC146818-compatible
  register roles, and RTC IRQ8 relation.

## Boundary

- Future TypeScript code will use explicit emulated time and native PIC wiring
  without PCjs imports, host time, NMI delivery, firmware, storage, or guest
  services.

## Future Path

- Executable parts will add local RTC/CMOS state, port wiring, selected
  configuration, and a truthful browser checkpoint in that order.
