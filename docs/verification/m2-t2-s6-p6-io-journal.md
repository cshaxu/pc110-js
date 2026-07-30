# M2 T2 S6 P6 Verification: Differential I/O Journal

The generic lockstep harness attaches configured test-only PCjs port callbacks
and a matching project-owned rebuilt port bus. For `E4 80 E6 80`, the first
iteration records an 8-bit read from `0x80` with value `0x5a`; the second
records an 8-bit write of `0x5a` to `0x80`. Both CPU paths match.

No PCjs device is instantiated, and this evidence does not provide an I/O
response for the selected ROM trace.
