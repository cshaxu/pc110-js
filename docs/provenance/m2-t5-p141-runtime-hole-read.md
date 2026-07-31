# M2 T5 P141 Provenance: DeskPro Runtime Hole Read

A fresh controlled reset matched through 47 instruction boundaries and then
reached `F000:F94F`, `CMP word ptr [E000:0000],55AAh`. Registers, segments,
devices, and timing matched before the instruction. PCjs produced EFLAGS
`0x97`, while native `0x86` proved it read `0xFFFF` rather than zero.

The exact native Group-One CMP regression independently produces `0x97` for a
zero word, so this is a memory-read policy difference, not a CPU flags defect.
P112's cold direct probe does not establish CPU-visible runtime behavior and
is superseded for this selected execution path.
