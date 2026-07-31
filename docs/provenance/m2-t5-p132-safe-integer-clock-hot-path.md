# M2 T5 P132 Provenance: Safe-Integer Clock Hot Path

Browser firmware execution spends substantial time in a real BIOS PIT-polling
loop. The selected machine's CPU, PIT, RTC, and DMA scheduler frequencies are
positive safe integers, and each one-instruction charge keeps every numerator
within the JavaScript safe-integer range.

The project keeps `bigint` in its public virtual-time and checkpoint contract,
but stores internal clock and remainder state as exact safe integers. The
former bigint recurrence remains the test oracle. This is a project-native
performance correction; it changes no virtual time, device phase, checkpoint
format, PCjs comparison contract, or guest-visible behavior.
