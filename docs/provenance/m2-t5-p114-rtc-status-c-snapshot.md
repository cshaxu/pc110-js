# M2 T5 P114 Provenance

- P113 cold replay showed PCjs `Status C` can vary before guest execution while
  CPU state and all other selected reset fields remain equal.
- PCjs evaluates RTC alarm state outside an instruction boundary and Status C
  is read-to-clear, so its unsampled latch phase is not a stable lockstep
  boundary input.
- EXC-004 excludes only that diagnostic field; CPU-visible `IN 0x71` remains
  compared after the instruction.
