# M1 T2 S5 Machine Contract Verification

## Scope

This record verifies the exact M1-to-M2 reference machine contract.

## Acceptance Checks

- The contract identifies the pinned source and selected XML.
- CPU, bus, memory map, ROM map, and every selected device are stated.
- Local boot media and archive-media exclusion are explicit.
- Browser resource and sibling-worktree boundaries are explicit.
- Generic PC/AT behavior is separated from DeskPro-specific variants.
- PC110 behavior is excluded.

## Result

Pass. The recorded contract matches the selected machine XML and M1 inventories
and provides a bounded M2 implementation target.
