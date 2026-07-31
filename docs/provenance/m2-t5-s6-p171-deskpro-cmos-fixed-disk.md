# M2 T5 S6 P171 DeskPro CMOS Fixed-Disk Provenance

## Evidence

After P170, the same bounded cold lockstep search reached `F000:B546` at
equal virtual cycle `2,744,586`. Native EAX changed to `0x9200`; PCjs changed
to `0x9250`.

The shared helper first writes AL to port `0x70` and then reads port `0x71`.
Here AL is `0x92`, selecting CMOS register `0x12` with NMI disabled. The
selected PCjs DeskPro machine declares one Type 5 fixed disk; PC/AT CMOS
register `0x12` therefore contains the drive-zero type in its high nibble,
or `0x50`.

## Decision

Represent the byte as a generic profile-owned RTC configuration value. The
DeskPro profile declares `0x50`; it does not mount, fabricate, or infer a
fixed-disk medium.
