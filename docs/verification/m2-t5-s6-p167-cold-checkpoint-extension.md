# M2 T5 S6 P167 Cold Checkpoint Extension Verification

## Check

- The existing cold reset search again matched 262,144 instruction boundaries.
- The paused endpoints then completed 128 additional 1,024-instruction batches.
- Each batch retained equal normalized state and virtual timing; the final
  batch consumed `4441/4441` native/PCjs cycles.

## Result

The controlled cold comparison matches through 393,216 instruction boundaries.
This is the final small extension before the next single governed
one-million-instruction option-ROM checkpoint comparison. It is not a DOS boot
or complete-state equivalence claim.
