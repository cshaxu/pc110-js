# M2 T5 P24 Native VGA Firmware Media Evidence

Manual browser validation selected the DeskPro system ROM, IBM VGA option ROM,
and local `fdd.img`, then mounted and ran the native machine. After 2.5 seconds
the browser reported `pc-at-386: running` at `F000:B5F5`, with no unmapped
expansion-ROM failure. This records media validation and native mapping only;
it is not evidence of VGA BIOS execution, floppy boot, or a DOS prompt.
