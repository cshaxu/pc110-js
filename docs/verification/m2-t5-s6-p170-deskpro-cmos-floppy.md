# M2 T5 S6 P170 DeskPro CMOS Floppy Verification

## Focused Checks

- RTC configuration writes and reads CMOS register `0x10` as `0x44`.
- The selected DeskPro configuration retains 640 KiB base memory, 3072 KiB
  extended memory, and the two-1.44MB-drive byte.
- Browser-native and ROM-trace construction receive the same profile-owned RTC
  configuration and deterministic date seed.

## Differential Check

The corrected cold PCjs replay must pass the `F000:B546` CMOS data read. The
same lockstep protocol then reports the next real difference, if any.
