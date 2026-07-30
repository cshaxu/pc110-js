# M2 T2 S6 P16 Verification: String I/O

The shared lockstep harness executes real-mode `INSB` then `OUTSB` through a
declared byte port. It compares the input write to ES:DI, source read from
DS:SI, index updates, changed RAM bytes, and both I/O journal entries.
