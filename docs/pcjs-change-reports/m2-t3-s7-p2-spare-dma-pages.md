# M2 T3 S7 P2 PCjs Change Report: Spare DMA Page Registers

## Summary

- Affected subsystem: selected unassigned 74LS612 DMA page registers,
  including DeskPro POST checkpoint port `0x84`.
- Changed behavior: original TypeScript retained byte state for all selected
  spare ports.

## Basis And Boundary

- PCjs maps `0x80`, `0x84`, `0x85`, `0x86`, `0x88`, `0x8C`, `0x8D`, and `0x8E`
  to independent spare-page storage. The implementation keeps those cells
  distinct from DMA channel pages and adds no DMA request, ignored write,
  firmware helper, storage, display, DOS, or PC110 behavior.
