# M2 T2 S6 P20 Verification: Accumulator And Flags

The generic real-mode program executes NOP, all accumulator XCHG forms, CBW,
CWD, SAHF, and LAHF. Every instruction boundary matches PCjs state, changed RAM
delta, and I/O journal output.
