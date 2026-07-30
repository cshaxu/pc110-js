# M2 T2 S6 P22 Verification: Byte String Interval

The generic real-mode program executes MOVSB, CMPSB, STOSB, LODSB, and SCASB.
Every instruction boundary matches PCjs register state, changed RAM delta, and
I/O journal output.
