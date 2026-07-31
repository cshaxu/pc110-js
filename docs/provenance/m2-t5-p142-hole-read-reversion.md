# M2 T5 P142 Provenance: DeskPro Hole-Read Reversion

P141 changed the native hole read to zero after one opposite lockstep sample.
A clean server restart, fresh browser reference, verified media mount, and
paired reset reproduced `F000:F94F` with PCjs EFLAGS `0x86`. The native zero
read produced `0x97`, so PCjs CPU-visible behavior is the original floating
`0xFFFF` word.

P142 restores the selected floating-read policy and records P141's sample as
non-equivalent diagnostic evidence. No CPU or device behavior is changed.
