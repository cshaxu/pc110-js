# M2 T4 S3 Fixed Storage Provenance

- Behavioral reference: pinned PCjs `hdc.js`, `driveinfo.js`, and selected
  IBM AT Type 5 configuration.
- Selected geometry: 940 cylinders, 6 heads, 17 sectors per track, 512 bytes
  per sector.
- Hardware boundary: primary AT command block `0x1F0`-`0x1F7`, control
  `0x3F6`, and IRQ14.
- Excluded: PCjs runtime/source, DOS/filesystem behavior, BIOS services,
  protected media, and synthetic boot results.

## P2 Raw Media

- Product code: original TypeScript `FixedDrive` media contract.
- Scope: validated complete raw image, Type 5 geometry, CHS sectors, explicit
  write protection, and attachment lifecycle.
- Excluded: ATA command handling, ports, IRQ, firmware, DOS/filesystem, and
  host-path access.

## P3 Primary Controller

- Product code: original TypeScript primary AT command-block controller,
  composed with native PC/AT IRQ14 routing.
- Scope: `0x1F0`-`0x1F7`, `0x3F6`, width rules, reset, status/error,
  selection, diagnostic/recalibrate/seek/verify, and no-media errors.
- Excluded: PIO sector transfer, guest shortcut, BIOS/DOS/filesystem behavior,
  PCjs source/runtime, and automatic media attachment.

## P4 PIO Read

- Product code: original TypeScript PIO sector-read state within the native AT
  controller, consuming project-owned raw fixed-drive sectors.
- Scope: `READ DATA`, DRQ, 8/16-bit data reads, sector boundary state,
  multi-sector CHS progression, status/error state, and IRQ14 service points.
- Excluded: auto-attachment, PIO write, identify, BIOS/DOS/filesystem, PCjs
  source/runtime, and guest shortcuts.

## P5 PIO Write

- Product code: original TypeScript PIO sector-write state within the native
  AT controller, committing only to an explicitly attached writable drive.
- Scope: `WRITE DATA`, DRQ, 8/16-bit data writes, multi-sector CHS/count
  progression, IRQ14 service points, terminal state, and write protection.
- Excluded: auto-attachment, identify, BIOS/DOS/filesystem, PCjs source/runtime,
  and guest shortcuts.
