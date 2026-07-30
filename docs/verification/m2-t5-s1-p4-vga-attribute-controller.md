# M2 T5 S1 P4 Verification: VGA Attribute Controller

Focused tests cover all attribute register classes, masks, index/data state,
palette gating, status-one flip-flop reset, byte width, reset, and machine
composition. The fixed selected-ROM trace completes 1,000 instructions at
`F000:9C05`; this is bounded progress, not a display or boot claim. The full
quality gate must pass before this part is committed.
