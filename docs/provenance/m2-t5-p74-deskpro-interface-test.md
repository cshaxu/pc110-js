# M2 T5 P74 Provenance

- Browser observation: the selected DeskPro ROM issues controller command
  `0xAB` before its keyboard error path. Its disassembly compares the returned
  byte with `0x05`; the generic native result was `0x00`.
- PCjs comparison: the generic PC/AT 8042 interface-test constant is `0x00`.
- Decision: preserve that generic default and make the observed `0x05` an
  explicit selected-machine option. This is a ROM/device contract, not a BIOS,
  keyboard, IRQ, BDA, or guest-memory workaround.
