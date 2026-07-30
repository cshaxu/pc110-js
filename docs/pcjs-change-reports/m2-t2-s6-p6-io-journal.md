# M2 T2 S6 P6 PCjs Change Report: Differential I/O Journal

## Summary

- Affected PCjs-derived subsystem: test-only Busx86 port-notification boundary.
- Changed behavior: none in PCjs or the product runtime.

## Justification

- CPU semantic comparison requires I/O side effects alongside register and
  memory state.
- Configured test-only callbacks provide identical deterministic inputs without
  introducing a PCjs device proxy or synthetic ROM-path device.

## Verification

- The byte IN/OUT program records matching read and write events with port,
  width, and value.
- Word/dword and DX-addressed forms remain subsequent coverage work.
