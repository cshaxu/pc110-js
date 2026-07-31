# M2 T5 S6 P170 DeskPro CMOS Floppy Provenance

## Evidence

The bounded cold search after P169 localized `F000:B546`, `IN AL,71h`, at
equal virtual cycle `2,744,498`. Native EAX changed to `0x9000`; PCjs changed
to `0x9044`.

A deterministic checkpoint at `F000:B544` reached after 804,762 native
instructions and replayed eight instructions twice identically. The window
contains `OUT 70h,AL` with AX `0x9090`, followed by `IN AL,71h`. Thus the ROM
reads CMOS register `0x10`, and PCjs's selected two-1.44MB-drive configuration
supplies `0x44`.

## Decision

Represent the byte as a generic profile-owned RTC configuration value. Apply
the selected value in every native DeskPro composition path. No firmware or
guest shortcut is introduced.
