# M2 T5 S5 COM2 UART Provenance

- Behavioral reference: selected DeskPro configuration and retained PCjs
  serial-port base/IRQ model.
- Trigger: after native COM1 success, the selected ROM stops at COM2 IIR
  `0x2FA`.
- Product code: existing project-native `Uart16550`, independently composed
  at `0x2F8` with IRQ3.
- Excluded: PCjs runtime/source, duplicated UART code, mouse behavior, host
  serial transport, browser APIs, BIOS/DOS services, and guest shortcuts.
