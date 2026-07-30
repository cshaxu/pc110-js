# M2 T4 S1 P2 PCjs Change Report: FDC Controller Core

PCjs defines the selected FDC's DOR, main-status, command collection, result
phase, reset completion, and non-data command behavior. Original TypeScript
now implements an isolated controller state model from that evidence. It does
not import PCjs, attach media, transfer DMA bytes, route IRQ6, expose I/O
ports, patch firmware, or add BIOS/DOS/filesystem behavior.
