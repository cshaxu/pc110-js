# M2 T2 S6 P19 Verification: ModR/M Move Slice

The generic real-mode program executes TEST, XCHG, both general MOV directions,
and LEA. Every instruction boundary matches PCjs state, changed RAM delta, and
I/O journal output.
