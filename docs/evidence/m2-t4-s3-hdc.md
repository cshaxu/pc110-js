# M2 T4 S3 Fixed Storage Evidence

## P1 Planning Evidence

- Level: Strong.
- Source: selected M1 configuration declares IBM AT Type 5; pinned PCjs drive
  table maps Type 5 to `940x6x17x512`; pinned controller source maps the
  primary AT ports and IRQ14 behavior.
- Boundary: P1 records the native controller and raw-media path only. It adds
  no port handling, media, BIOS behavior, or boot result.
