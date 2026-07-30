# M2 T3 S4 P4 PCjs Change Report: CMOS Configuration

## Summary

- Affected PCjs-derived subsystem: selected CMOS configuration bytes.
- Changed product behavior: adds project-native explicit base-memory,
  extended-memory, equipment, and checksum configuration state.

## Basis

- The M1 DeskPro 386 4MB contract records 640 KiB low RAM and 3072 KiB
  extended RAM. PCjs documents the standard CMOS memory-byte and checksum
  roles.

## Boundary

- The M1 values are a named DeskPro variant input, not a generic PC/AT default.
  No DeskPro wiring, ROM-map, host storage, firmware, media, or PCjs runtime is
  added.

## Verification

- Focused tests verify bounded byte initialization, checksum recalculation,
  generic-default separation, and configuration restoration on device reset.
