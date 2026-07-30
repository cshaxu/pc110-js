# M2 T3 S7 P3 Verification: Selected Floating Bus

Focused tests preserve strict defaults and verify selected `0xFF` unmapped reads
with ignored writes. The full gate passed. The selected trace reaches
`F000:F9B6` after 63 instructions and stops at I/O port `0xF1`.
