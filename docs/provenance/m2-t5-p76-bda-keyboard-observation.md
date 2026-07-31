# M2 T5 P76 Provenance

- Selected ROM evidence: `F000:DCA6` calls `F000:C242`, which compares BDA
  words `0x41A` and `0x41C` before looping. It follows `INT 15h` with
  `AH=0x90`, `AL=0x02`.
- Need: browser status previously showed controller and PIC state but not the
  guest-visible keyboard-ring boundary that releases the loop.
- Boundary: the observation reads native physical memory only. It does not
  write BDA memory, inject a key, acknowledge an interrupt, or alter firmware.
