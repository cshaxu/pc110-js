# M2 T2 S6 P25 Verification: Near Return

The generic real-mode program executes C2 with immediate cleanup, then C3
through prepared return frames. Every instruction boundary matches PCjs state,
changed RAM delta, and I/O journal output.
