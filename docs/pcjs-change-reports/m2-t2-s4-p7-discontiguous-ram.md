# M2 T2 S4 P7 PCjs Change Report: Discontiguous RAM Map

## Summary

- Affected PCjs-derived subsystem: selected M1 physical-memory map.
- Changed behavior: project-native memory can now represent the selected
  discontiguous RAM regions.

## Justification

- The selected M1 DeskPro contract declares low RAM, a `0xFA0000` RAM window,
  and extended RAM beginning at `0x100000`.
- A single contiguous low-RAM allocation cannot represent that map or preserve
  unmapped hardware holes.

## Verification

- Focused synthetic tests verify each selected RAM region, unmapped holes, and
  overlap rejection.
- The full project gate remains required before commit.
