# M2 T5 S6 P147 Batch Lockstep Provenance

## Source

The established local PCjs `pc110` diagnostic control already executes one
ordinary positive CPU budget while paused. P147 extracts that exact budget into
a private helper and calls it repeatedly for an opt-in batch, retaining only
the batch boundaries.

## Project-Native Work

The TypeScript coordinator and native adapter expose matching batch contracts.
On an architectural mismatch they restart through ordinary reset, replay only
the matching prefix in batches, then use the pre-existing one-instruction
coordinator on the small differing batch.

## Non-Transfer

No PCjs JavaScript, execution state, CPU handler, device implementation,
firmware behavior, or timer shortcut is used by the product runtime.
