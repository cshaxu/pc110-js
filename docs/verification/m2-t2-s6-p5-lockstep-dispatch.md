# M2 T2 S6 P5 Verification: Lockstep Dispatch Harness

The differential harness accepts program bytes and a positive instruction
budget. For every iteration it captures both pre-states, calls the existing
rebuilt runner dispatcher once, calls PCjs `stepCPU(0)` once, and compares
post-state and changed-memory data.

The mixed `B0 5A A2 00 02 49 90` real-mode program passed four automatic
instruction comparisons. This is the generic execution path for ledger-driven
matrices and ROM traces; small programs now minimize evidence rather than
define per-opcode harness behavior.
