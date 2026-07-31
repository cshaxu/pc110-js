# M2 T5 S6 P147 Verification

## Focused Checks

- The coordinator compares a matched bounded batch without intermediate
  snapshots.
- A deterministic-reset fixture finds the first architectural difference in a
  mismatched batch through single-instruction replay.
- The native adapter executes a bounded batch and reports its cycle total.
- PCjs reference assets require both source and regenerated uncompiled bundle
  to contain `stepPC110LockstepBatch`.

## Browser Check

- With the selected local ROMs and floppy mounted in one diagnostic browser
  tab, normal reset established an equal native/PCjs boundary.
- An opt-in 1024-instruction batch then matched both normalized snapshots and
  virtual-cycle totals at `3434` cycles on each endpoint.

## Boundary

This is diagnostic-only. It does not claim a DOS boot or resolve the current
keyboard-controller divergence. The next part uses the control on the selected
ROM from an equivalent reset boundary.
