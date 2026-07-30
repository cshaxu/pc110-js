# M2 T5 P24 Verification: VGA Firmware Media

Focused checkpoint coverage proves that an immutable VGA ROM maps at `0xC0000`
beside the system ROM aliases and native floppy attachment. Manual browser
acceptance mounted all three validated local media files and remained running
at `F000:B5F5` after 2.5 seconds. This does not claim VGA BIOS or DOS execution
until the firmware trace reaches those stages.
