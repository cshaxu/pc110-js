# M2 T3 S7 P1 PCjs Change Report: BIOS POST Checkpoint Plan

## Summary

- Affected PCjs-derived subsystem: selected DeskPro 386 POST checkpoint and
  spare DMA page-register port ownership.
- Changed product behavior: none; this part records a project-native plan.

## Basis

- PCjs maps `0x84` and the other selected spare ports as retained byte cells,
  and documents the DeskPro 386 ROM's checkpoint use of `0x84`.

## Boundary

- Future TypeScript code will implement real spare-register state and advance
  only the classified ROM path. It will not add ignored I/O, a firmware patch,
  PCjs imports, host services, storage, display, or DOS behavior.

## Future Path

- Executable parts will add spare-register state, verify the trace advance,
  ledger the next blocker, and repeat by actual device ownership.
