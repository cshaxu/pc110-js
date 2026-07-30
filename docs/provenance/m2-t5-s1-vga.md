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

## P2 MDA Compatibility

PCjs maps CRTC index/data aliases at `0x3B0`-`0x3B7`, MDA mode at `0x3B8`, and
status at `0x3BA`. The native state model retains those values and exposes a
deterministic status signal without adopting PCjs rendering or timing code.

## P3 CGA Compatibility

PCjs maps the CGA CRTC index/data registers at `0x3D4`/`0x3D5`, mode at
`0x3D8`, color select at `0x3D9`, and status at `0x3DA`. The native model
retains the full compatibility group and deterministic retrace bits without
adopting PCjs display, timing, font, BIOS, or browser code.
