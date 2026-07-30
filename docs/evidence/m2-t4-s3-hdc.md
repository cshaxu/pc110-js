# M2 T4 S3 Fixed Storage Evidence

## P1 Planning Evidence

- Level: Strong.
- Source: selected M1 configuration declares IBM AT Type 5; pinned PCjs drive
  table maps Type 5 to `940x6x17x512`; pinned controller source maps the
  primary AT ports and IRQ14 behavior.
- Boundary: P1 records the native controller and raw-media path only. It adds
  no port handling, media, BIOS behavior, or boot result.

## P2 Raw Media Evidence

- Focused tests cover complete-image validation, CHS addressing, attachment,
  ejection, readiness, write protection, defensive copies, writable updates,
  and the exact 49,090,560-byte Type 5 geometry.
- No media is auto-attached and no protected asset is loaded or tracked.

## P3 Primary Controller Evidence

- Focused tests cover the full port family, data-port width boundary, selected
  register readback, recalibrate, seek, verify, status-read interrupt clear,
  no-media and invalid-CHS errors, and software-reset transitions.
- Rebuilt-machine coverage verifies controller composition and IRQ14 routing
  through the native slave PIC path.

## P4 PIO Read Evidence

- Focused tests use attached raw sectors and verify little-endian 16-bit and
  byte reads, DRQ, interrupt clearing/reassertion between sectors, sector
  count, CHS progression, terminal state, and the existing no-media/invalid
  CHS error paths.
- No disk image is auto-attached and no filesystem or firmware response is
  used to obtain sector bytes.
