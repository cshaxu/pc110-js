# M2 T5 S6 P170 DeskPro CMOS Floppy Configuration

## Summary

- Affected behavior: selected DeskPro RTC/CMOS profile composition.
- PCjs evidence: the configured PCjs chipset has `floppies="[1440,1440]"` and
  returns CMOS register `0x10 = 0x44` at the selected ROM checkpoint.
- Native change: expose `floppyDriveTypes` through the generic RTC/CMOS
  configuration contract and select `0x44` in the DeskPro profile.

## Justification

The cold lockstep first difference after P169 was `IN AL,71h` at
`F000:B546`. A deterministic short replay showed the immediately preceding
`OUT 70h,AL` selects `0x90`, or CMOS register `0x10` with NMI disabled. PCjs
returns `0x44`; the native default returned `0x00` because the profile supplied
memory sizes but no floppy-drive CMOS byte.

## Implementation Boundary

This is profile data, not a BIOS response. Generic RTC defaults remain zero;
another machine can provide a different byte or omit it. The same profile is
passed to the browser-native checkpoint and the headless ROM trace, preventing
diagnostic-only behavior.

## Verification

- RTC unit coverage verifies the byte and checksum-bearing configuration path.
- DeskPro profile coverage verifies the selected `0x44` byte.
- The cold PCjs replay must cross `F000:B546`; any later first difference is
  independently localized.

## Non-Transfer

No PCjs source, BIOS, DOS, guest-service, or device-state proxy enters the
product runtime. PCjs remains the behavior authority only.
