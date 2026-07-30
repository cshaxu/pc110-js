# M2 T3 S7 P5 Verification: DeskPro Secondary PIT

Focused tests cover the complete byte-wide port group, control readback,
counter advancement, reset, and selected-machine-only composition. The full
gate passed with 100 test files and 781 tests. The selected-ROM trace advances
to 216 instructions at `F000:BB26` and stops at the FDC digital-output port,
`0x3F2`.
