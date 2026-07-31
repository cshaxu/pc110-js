# M2 T5 S6 P156 DeskPro Refresh Signal Provenance

## Evidence

P155's cold diagnostic localized the first architectural difference to
`F000:B574`, `IN AL,61h`. Native returned bit 4 set while PCjs returned it
clear. PCjs's selected DeskPro 386 `in8042RWReg()` handler derives port `0x61`
refresh bit 4 from virtual CPU cycle bit 6. Its generic PC/AT behavior remains
separate from that DeskPro wiring.

## Project-Native Work

The generic system-control device retains PIT counter-1 refresh output by
default and exposes an explicit profile-owned refresh-status signal. The
DeskPro core composition selects a pure callback derived from its deterministic
virtual-cycle clock. No CPU, firmware, or host-time behavior is changed.

## Non-Transfer

No PCjs code was copied and no PCjs source was changed. The DeskPro signal is
selected by machine composition rather than embedded in the generic device.
