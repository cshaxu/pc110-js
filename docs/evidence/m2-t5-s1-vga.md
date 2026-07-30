# M2 T5 S1 VGA Evidence

## Claim

The selected ROM's `0x3B8` write is real display-controller initialization,
not a diagnostic sink. The selected M1 machine declares IBM VGA, whose full
hardware path includes compatible MDA/CGA probes and native VGA registers.

## Evidence

- Level: Strong.
- Source: pinned read-only PCjs `video.js` MDA mode definition, MDA port table,
  VGA register definitions, and selected DeskPro VGA machine XML.
- Reproduction: after M2 T4 S1 P4, `pnpm run trace:rebuilt-rom` stops after
  221 instructions at `F000:BB30` on `Unmapped I/O write port: 0x3B8`.

## Accepted Boundary

P1 records the display implementation boundary only. It adds no video port,
memory, renderer, BIOS, DOS, font, framebuffer, or browser behavior.

## P2 MDA Compatibility Evidence

- Level: Strong.
- Source: pinned read-only PCjs `video.js` MDA register definitions and full
  MDA input/output port tables.
- Tests: mirrored CRTC index/data, retained mode, deterministic status, width,
  write ownership, reset, and machine composition.
- Trace: native MDA state advances the selected ROM to 224 instructions at
  `F000:BB36`, stopping on CGA compatibility mode port `0x3D8`.
