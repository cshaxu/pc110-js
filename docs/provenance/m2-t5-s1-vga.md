# M2 T5 S1 VGA Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs `video.js` and selected DeskPro
  386 `vga/4096kb/machine.xml`.
- Selected configuration: IBM VGA, 4MB DeskPro 386, `floppies="[1440,1440]"`.
- Initial ROM boundary: `F000:BB30` writes MDA compatibility mode port `0x3B8`.
- Product code: original TypeScript; PCjs runtime, VGA BIOS, fonts, archival
  media, browser code, and firmware services are excluded.

## Initial Compatibility Finding

PCjs identifies `0x3B8` as the MDA mode register and maps MDA/CGA compatibility
alongside EGA/VGA register domains. The selected VGA profile therefore needs
retained compatibility probe state before the complete VGA path can advance.
