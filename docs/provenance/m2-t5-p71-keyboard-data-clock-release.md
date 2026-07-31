# M2 T5 P71 Provenance

- Trigger: browser checkpoint `F000:C246` shows the selected ROM waiting on the
  BDA keyboard queue while the native 8042 command byte is `0x5D`. ROM source
  sends keyboard data to port `0x60` before its later `0xAE` command.
- Contract: a direct keyboard data byte clears the 8042 keyboard clock inhibit
  before its response is admitted to the existing output-buffer and IRQ1 path.
- Authority: PCjs `chipset.js` releases `NO_CLOCK` in the corresponding
  keyboard-data route. The implementation is project-native TypeScript.
- Boundary: no synthetic key, BIOS/BDA mutation, timing shortcut, or runtime
  PCjs dependency is added.
