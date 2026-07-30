# M2 T5 S5 COM1 UART Evidence

## P1 Planning Evidence

- Level: Strong.
- Source: pinned PCjs `serial.js` identifies `0x3FA` as COM1 IIR; selected
  DeskPro configuration declares COM1.
- Reproduction: project-native ROM trace stops at `F000:A9AC` on an unmapped
  `0x3FA` read after 805,044 instructions.
- Boundary: P1 records the complete hardware family; it adds no port sink.
