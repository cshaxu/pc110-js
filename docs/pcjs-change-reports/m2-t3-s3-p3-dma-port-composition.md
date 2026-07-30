# M2 T3 S3 P3 PCjs Change Report: DMA Port Composition

## Summary

- Affected PCjs-derived subsystem: PC/AT DMA controller and page-register ports.
- Changed product behavior: project-native DMA port composition only.

## Basis

- PCjs records the selected DMA0/DMA1 port map, even DMA1 addressing, and page
  register ownership.

## Boundary And Verification

- Native device and rebuilt port-bus interfaces are composed without PCjs,
  memory movement, FDC, firmware, media, or host timer imports.
- Focused tests cover port routing, widths, controller separation, and reset.

## Future Path

- P4 adds cascade arbitration and generic explicit memory/device movement.
