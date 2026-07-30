# M2 T5 S5 COM1 UART Evidence

## P1 Planning Evidence

- Level: Strong.
- Source: pinned PCjs `serial.js` identifies `0x3FA` as COM1 IIR; selected
  DeskPro configuration declares COM1.
- Reproduction: project-native ROM trace stops at `F000:A9AC` on an unmapped
  `0x3FA` read after 805,044 instructions.
- Boundary: P1 records the complete hardware family; it adds no port sink.

## P2 Native Device Evidence

- Focused tests cover all COM1 registers, DLAB, FIFO thresholds, line-status
  clearing, modem deltas, IIR priority, loopback, transmit observation, reset,
  byte-width rejection, and IRQ4 composition.
- The selected 1,000,000-instruction ROM trace crosses native COM1 IIR
  `0x3FA` and then stops at unimplemented COM2 IIR `0x2FA` after 805,057
  instructions.
- The next stop is recorded as a device dependency, not handled by synthetic
  COM1 behavior.
