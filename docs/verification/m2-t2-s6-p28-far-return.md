# M2 T2 S6 P28 Verification: Far Return

The generic real-mode program executes CA with immediate cleanup, then CB from
another code segment through prepared return frames. Every instruction boundary
matches PCjs state, changed RAM delta, and I/O journal output.
