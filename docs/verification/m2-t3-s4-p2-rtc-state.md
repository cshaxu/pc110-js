# M2 T3 S4 P2 Verification: RTC/CMOS State

Focused tests validate deterministic initial state, BCD/binary and 12/24-hour
conversion, leap-day rollover, SET inhibition, periodic/update/alarm flags,
status-C read-clear acknowledgement, ordinary CMOS bytes, and checksum output.
The full format, build, lint, test, and diff gate passes. Port wiring, IRQ8,
NMI, host time, firmware, storage, and browser work are not claimed.
