# M2 T5 S5 P3 PCjs Change Report: Native COM2 UART

The retained PCjs configuration establishes COM2's conventional base/IRQ
wiring. This part composes the existing original TypeScript UART model at
`0x2F8`/IRQ3. No PCjs code, runtime, transport, firmware, or guest service is
introduced.
