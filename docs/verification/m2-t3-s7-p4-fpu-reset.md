# M2 T3 S7 P4 Verification: PC/AT FPU Control

Focused tests cover both source-established control ports, byte-width and
zero-output validation, unmapped reads, machine composition, and reset state.
The full gate passed. The selected-ROM trace advances to 197 instructions at
`F000:BAFF` and stops at the next unclassified I/O write, `0x4B`.
