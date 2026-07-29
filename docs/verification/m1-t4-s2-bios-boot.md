# M1 T4 S2 Verification: BIOS And Boot Path

## Result

Pass.

## Command

An isolated local Edge headless profile opened the generated M1 machine XML
with a 2000 ms virtual-time budget and a temporary local screenshot.

## Observed Markers

- `PCx86 v2.23` started in the display.
- The DeskPro 386 system ROM and IBM VGA ROM loaded.
- `Loading /_pc110js/media/fdd.img...` appeared.
- PCjs reported the local DOS floppy mounted in drive A.
- The machine reported `Initialization complete`.

The raw screenshot remains local and is not tracked.
