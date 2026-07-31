# M2 T5 P133 Provenance: Safe Clock Overflow Guard

P132 moves per-instruction timing arithmetic to exact safe integers. The normal
core always supplies small instruction charges, but the scheduler and PIT APIs
remain reusable public TypeScript boundaries. Their former bigint arithmetic
accepted arbitrarily large safe-integer charges without loss.

Each clock conversion now rejects only a charge whose exact numerator cannot
be represented safely. Normal machine execution is unchanged; checkpoint and
frequency contracts remain the same.
