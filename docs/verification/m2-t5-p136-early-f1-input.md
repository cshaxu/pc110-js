# M2 T5 P136 Verification: Early F1 Input

- Set-1 mapping tests cover the F1 make (`3B`) and break (`BB`) bytes.
- In a browser-native run with verified local ROM, VGA ROM, and floppy media,
  F1 was queued immediately after start and retained through the firmware path.
- The run reached `F000:DCA6` with `8042 CMD 5D`, no output buffer byte, and
  BDA keyboard head/tail both `001E`. Early input therefore does not resolve
  the ROM's selected keyboard-wait path and no boot-success claim is made.
