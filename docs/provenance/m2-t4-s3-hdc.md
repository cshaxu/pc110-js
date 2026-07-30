# M2 T4 S3 Fixed Storage Provenance

- Behavioral reference: pinned PCjs `hdc.js`, `driveinfo.js`, and selected
  IBM AT Type 5 configuration.
- Selected geometry: 940 cylinders, 6 heads, 17 sectors per track, 512 bytes
  per sector.
- Hardware boundary: primary AT command block `0x1F0`-`0x1F7`, control
  `0x3F6`, and IRQ14.
- Excluded: PCjs runtime/source, DOS/filesystem behavior, BIOS services,
  protected media, and synthetic boot results.
