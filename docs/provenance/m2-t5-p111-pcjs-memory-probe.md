# M2 T5 P111 Provenance

- P109 advanced a controlled replay beyond `F000:F94F`, but a later clean
  replay returned a contradictory physical-hole result at the same boundary.
- PCjs's existing reset diagnostic calls its normal `Computer.reset()` path,
  which does not establish a cold memory image for this question.
- The owner-authorized PCjs `pc110` probe reads only the two physical locations
  under investigation so subsequent comparisons can record reference state
  instead of inferring it from EFLAGS alone.
