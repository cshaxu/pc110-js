# M2 T5 S5 COM1 UART Provenance

- Behavioral reference: pinned read-only PCjs `serial.js` and selected DeskPro
  386 machine XML.
- Trigger: native ROM trace stops at COM1 IIR `0x3FA` after 805,044
  instructions.
- Product code: original TypeScript device and machine composition only.
- Excluded: PCjs runtime/source, BIOS/DOS behavior, host serial transport,
  browser APIs, and mouse protocol behavior.
