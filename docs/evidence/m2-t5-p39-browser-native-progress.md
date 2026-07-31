# M2 T5 P39 Browser Native Progress

The local browser selected the validated DeskPro system ROM, IBM VGA option
ROM, and DOS floppy through the project-native media controls. After Run, the
native core progressed from `F000:C675` to `F000:C67A` in ten seconds and
paused responsively at `F000:C672`.

Native status showed primary PIC request `0x41`, PIT0 output low, PIT2 output
high, RTC status C `0x50`, and the DeskPro secondary-PIT-composed machine.
The canvas was blank. This proves browser-native execution progress only; it
does not prove a completed POST, floppy boot, DOS prompt, keyboard path, or
rendered text mode.
