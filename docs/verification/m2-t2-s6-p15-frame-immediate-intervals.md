# M2 T2 S6 P15 Verification: Frame And Immediate Intervals

The harness records changed-byte RAM deltas on both sides. Real-mode `60 61`
and a `68-6B` program containing immediate PUSH, POP, and both immediate IMUL
forms pass instruction-by-instruction lockstep comparison.
