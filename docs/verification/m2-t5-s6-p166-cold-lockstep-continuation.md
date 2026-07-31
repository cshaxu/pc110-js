# M2 T5 S6 P166 Cold Lockstep Continuation Verification

## Check

- The cold diagnostic reset matched through 262,144 instruction boundaries in
  256 batches.
- The paused endpoints then completed 64 additional 1,024-instruction batches.
- Every additional batch reported equal normalized state and equal virtual
  cycles; the final batch consumed `3200/3200` native/PCjs cycles.

## Result

The controlled cold comparison matches through 327,680 instruction boundaries.
This is a bounded differential result only. It does not establish a native DOS
boot or a complete-state equivalence claim.
