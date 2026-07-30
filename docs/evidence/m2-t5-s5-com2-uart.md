# M2 T5 S5 COM2 UART Evidence

- Focused rebuilt-machine coverage verifies COM2 register access and its IRQ3
  signal separately from COM1/IRQ4.
- The selected 1,000,000-instruction ROM trace crosses `0x2FA` and next stops
  at LPT1 status port `0x3BC` after 805,073 instructions.
