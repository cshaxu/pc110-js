# M2 T5 P77 Provenance

- PCjs selected DeskPro 386 configuration maps `0xA0000` low RAM, 1 MiB of
  extended RAM at `0x100000`, and 384 KiB of Compaq relocatable RAM at
  `0xFA0000`.
- Native browser and reference-ROM construction previously allocated low RAM
  only, despite using the same selected DeskPro ROM.
- Decision: represent the three apertures in a project-native selected-machine
  memory factory. The existing physical-memory API owns mapping and snapshot
  behavior; no ROM, BIOS, guest service, or host-memory fallback is added.
