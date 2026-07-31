# M2 T5 S6 P148 Verification

## Focused Checks

- The browser diagnostic control retains a 1024-instruction batch size.
- The reset-to-first-difference search is limited to 65536 instructions for
  the current selected-ROM blocker.

## Boundary

This is one bounded Fast Execution search for an already known blocker. It is
not a normal long replay, does not retain intermediate snapshots, and does not
claim a DOS boot.
