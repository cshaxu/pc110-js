# M2 T3 S7 P2 Verification: Spare DMA Page Registers

Focused tests cover every selected spare port at byte width, independent
retained read/write values, coexistence with DMA channel page `0x81`, zero reset
state, and rejection of non-byte access. The full quality gate remains required
before this part is committed.

`pnpm run trace:rebuilt-rom` then advanced the selected ROM to `F000:F94F`
after 34 instructions and reported the next unimplemented physical read at
`0xE0000`.
