# M2 T5 P142 Verification: DeskPro Hole-Read Reversion

- A clean local server, new PCjs reference page, verified media mount, and
  paired reset reached the prior `F000:F94F` boundary with PCjs EFLAGS `0x86`.
- The restored native floating-read policy is required for the same CMP result.
- Focused DeskPro memory and checkpoint coverage retain `0xFF` hole reads and
  ignored writes. The full project gate must pass before commit.
