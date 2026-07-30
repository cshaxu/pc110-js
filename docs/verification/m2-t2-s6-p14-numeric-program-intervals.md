# M2 T2 S6 P14 Verification: Numeric Program Intervals

The common lockstep harness passes four real-mode programs: selected `00-3F`
accumulator arithmetic, full `40-4F`, full `50-5F`, and full `B0-BF` byte and
word immediate-register encodings. Each trace compares every logical
instruction boundary. EXC-002 remains an explicitly non-passing AF divergence.
