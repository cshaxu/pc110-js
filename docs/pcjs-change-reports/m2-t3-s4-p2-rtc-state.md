# M2 T3 S4 P2 PCjs Change Report: RTC/CMOS State

## Summary

- Affected PCjs-derived subsystem: MC146818-compatible RTC/CMOS state.
- Changed product behavior: adds an isolated project-native deterministic
  register/calendar model; no machine port, IRQ, firmware, or browser path.

## Basis

- PCjs documents the selected register roles, BCD/binary and hour-format
  conversion, status-C acknowledgement, periodic/update/alarm status, and
  checksum range.

## Boundary

- The TypeScript model uses no PCjs import, host time, port bus, PIC, NMI,
  firmware, storage, media, or guest-service behavior.

## Verification

- Focused tests cover deterministic time, format conversions, leap-day and SET
  handling, event/status acknowledgement, ordinary CMOS storage, and checksum.
