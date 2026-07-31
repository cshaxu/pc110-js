# M2 T5 P144 Verification: DeskPro 4 MiB Memory Correction

- The pinned M1 machine XML and the current local PCjs `pc110` branch both
  declare `ramExt addr="0x100000" size="0x300000"`.
- Focused native memory coverage writes and reads the first and final bytes of
  that aperture, preserves the independent relocatable RAM window, and
  confirms the following byte remains an unmapped floating read.
- A clean browser rerun with verified local media reached the same
  `F000:C24B` keyboard-buffer path and retained `0x5D`; the correction does
  not by itself resolve that independent blocker or make a DOS-boot claim.
- The full project gate must pass before commit.
