# M2 T5 S6 P171 DeskPro CMOS Fixed-Disk Configuration

## Summary

- Affected behavior: selected DeskPro RTC/CMOS profile composition.
- PCjs evidence: the selected HDC declares drive type 5, and the cold ROM
  checkpoint reads CMOS register `0x12 = 0x50`.
- Native change: expose `fixedDriveTypes` through the generic RTC/CMOS
  configuration contract and select `0x50` in the DeskPro profile.

## Justification

The first cold difference after P170 occurs at `F000:B546`, `IN AL,71h`.
The immediately preceding `OUT 70h,AL` selects `0x92`, which is register
`0x12` with NMI disabled. The native default is zero; PCjs returns `0x50`.

## Implementation Boundary

This is a profile configuration byte, not a disk controller response or a
firmware shortcut. The generic default remains zero. No disk image is
attached and no HDC behavior changes.

## Verification

- RTC coverage verifies the configured byte and checksum path.
- DeskPro profile coverage verifies `0x12 = 0x50`.
- The next cold lockstep replay must cross this read and independently report
  any later difference.

## Non-Transfer

No PCjs source, BIOS, DOS, guest-service, or device-state proxy enters the
product runtime. PCjs remains the behavior authority only.
