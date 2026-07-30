# M2 T5 S5 P2 PCjs Change Report: Native COM1 UART

PCjs `serial.js` provides the retained register-family and interrupt-priority
reference. This part implements an original TypeScript 16550-compatible model
and composes it at COM1/IRQ4. It imports no PCjs code or runtime and adds no
firmware, DOS, browser-serial, or mouse behavior.
