# M2 T5 S6 P171 DeskPro CMOS Fixed-Disk Verification

## Focused Checks

- RTC configuration writes and reads CMOS register `0x12` as `0x50`.
- The selected DeskPro configuration retains its memory, floppy, and fixed-disk
  configuration bytes.

## Differential Check

The corrected cold PCjs replay must pass the `F000:B546` fixed-disk CMOS read.
Any subsequent first difference is independently localized.
