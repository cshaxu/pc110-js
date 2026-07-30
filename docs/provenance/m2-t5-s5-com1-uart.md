# M2 T5 S5 COM1 UART Provenance

- Behavioral reference: pinned read-only PCjs `serial.js` and selected DeskPro
  386 machine XML.
- Trigger: native ROM trace stops at COM1 IIR `0x3FA` after 805,044
  instructions.
- Product code: original TypeScript device and machine composition only.
- Excluded: PCjs runtime/source, BIOS/DOS behavior, host serial transport,
  browser APIs, and mouse protocol behavior.

## P2 Native COM1 Device

- Product code: `src/devices/uart16550.ts`, composed as COM1 by the rebuilt
  PC/AT core.
- Hardware scope: byte-wide `0x3F8`-`0x3FF`, DLAB, FIFO, line/modem state,
  loopback, RX/TX contracts, IIR priority, and IRQ4 signal.
- Follow-up: the selected ROM also probes COM2 at `0x2FA`; this device model
  will be reused through a separate COM2 composition part.
