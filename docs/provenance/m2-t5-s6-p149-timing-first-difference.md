# M2 T5 S6 P149 Timing First-Difference Provenance

## Source

P148 found the first compared state mismatch in PIT channel one at `F000:BBCA`,
but its boundary already showed a one-cycle native/PCjs difference. The prior
batch narrowing rule accepted cycle-only batch differences until a later
architectural or device field differed.

## Project-Native Work

The project-owned coordinator now treats a per-instruction cycle-charge
difference as the first difference. It reports the exact pre/post boundary and
does not continue to a derivative device-state mismatch.

## Non-Transfer

This changes diagnostic classification only. It does not change PCjs, CPU,
device, firmware, or product-runtime behavior.
