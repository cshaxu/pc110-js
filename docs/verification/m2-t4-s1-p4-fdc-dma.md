# M2 T4 S1 P4 Verification: FDC Read DMA

Focused tests cover FDC execution phases, raw READ ID/READ DATA bytes, port
ownership, DOR reset IRQ6, and a 128-byte CHS sector transferred through
configured native DMA2 into physical memory. The full quality gate and selected
ROM trace passed. The trace advances to 221 instructions at `F000:BB30` and
stops at the next display-domain port, `0x3B8`.
