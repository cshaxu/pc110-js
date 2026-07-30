# M2 T2 S6 P29 Verification: Software Interrupt

The generic real-mode program executes INT3, INT imm8, overflow-enabled INTO,
and each IRET through prepared IVT targets. Every instruction boundary matches
PCjs state, changed RAM delta, and I/O journal output.
