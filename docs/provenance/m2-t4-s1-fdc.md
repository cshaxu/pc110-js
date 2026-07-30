# M2 T4 S1 Floppy Controller Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs `machines/pcx86/modules/v2/fdc.js`
  and `chipset.js`.
- Ports: DOR `0x3F2`, main status `0x3F4`, data `0x3F5`, and digital
  input/control `0x3F7`.
- Wiring: PC/AT FDC uses DMA channel 2 and IRQ6.
- Product code: original TypeScript only; PCjs runtime, controller source,
  firmware patching, DOS services, and filesystem behavior are excluded.

## Initial ROM Boundary

After the selected DeskPro secondary PIT is enabled, the bounded ROM trace
reaches `F000:BB26` after 216 instructions and writes DOR port `0x3F2`.
PCjs defines this as the AT floppy-controller digital-output register: bits
0-1 select a drive, bit 2 enables the controller, bit 3 enables IRQ/DMA, and
bits 4-5 control the two supported drive motors.
