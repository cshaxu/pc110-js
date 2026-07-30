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

## P4 VGA Attribute Controller

PCjs maps the `0x3C0` index/data flip-flop, `0x3C1` data reads, palette-enable
bit, 21 attribute registers, and the status-one read reset. The native model
retains those register contracts with a narrow status-read callback. It does
not adopt PCjs rendering, font, timing, DAC, BIOS, or browser code.

## P5 VGA Sequencer And Trace Diagnostics

PCjs maps the sequencer index/data ports at `0x3C4`/`0x3C5` and five register
classes. The project-native sequencer retains those values for later VGA
memory-plane consumers. The project-owned trace options add only observation
controls; they do not alter CPU, firmware, or device behavior.

## P6 Cycle-Accounted Trace Recovery

PCjs documents the selected DeskPro ROM's early-80386 `MOV CR` MOD-field
encoding and derives PIT movement from accumulated CPU cycles. Original
TypeScript now uses a project-owned step-cycle result and exact integer-ratio
PIT scheduling, with a narrowly scoped control-register compatibility rule.
No PCjs source, runtime, firmware service, timer callback, or browser code is
imported.

## P7 PC/AT Refresh Status

PCjs documents port `0x61` refresh-state observation as PC/AT system control.
Original TypeScript exposes the existing native PIT channel-1 output at that
read bit. It imports no PCjs chipset code, firmware response, or audio behavior.
