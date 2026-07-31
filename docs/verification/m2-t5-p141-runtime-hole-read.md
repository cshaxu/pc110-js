# M2 T5 P141 Verification: DeskPro Runtime Hole Read

- DeskPro checkpoint coverage asserts `E0000` reads as zero and hole writes
  remain ignored.
- The Group-One regression verifies the exact ROM `CMP r/m16,imm16` flags for
  a zero word are `0x97`.
- A fresh controlled browser reset must cross the former `F000:F94F` boundary
  before this part is considered runtime-verified.
