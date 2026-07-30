# M2 T2 S6 P4 Verification: Differential Memory Delta

The lockstep harness initializes independent one-megabyte RAM images, snapshots
the PCjs image before execution, and compares its changed-byte delta with the
rebuilt memory-bus write result. The `A2 00 02` `MOV moffs, AL` case matched the
byte at physical address `0x200` after one real-mode instruction.

This verifies changed memory state, not unchanged-value write observability,
I/O, exceptions, or protected-mode behavior.
