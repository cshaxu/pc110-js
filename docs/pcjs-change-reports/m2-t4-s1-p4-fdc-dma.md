# M2 T4 S1 P4 PCjs Change Report: FDC Read DMA

PCjs assigns FDC ports `0x3F2`, `0x3F4`, `0x3F5`, and `0x3F7`, DMA channel 2,
and IRQ6. Original TypeScript now maps those ports, executes raw READ ID/READ
DATA through an explicit DMA2 grant, and raises native IRQ6. It imports no PCjs
runtime, auto-mounts no protected media, and adds no timing, BIOS, DOS, or
filesystem shortcut.
