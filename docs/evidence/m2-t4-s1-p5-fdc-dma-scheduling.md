# M2 T4 S1 P5 FDC DMA Scheduling Evidence

The machine already owned native FDC DMA transfer mechanics, but normal CPU
execution did not advance a pending request. P5 derives byte-service slots from
project-native CPU cycles and the FDC data-rate register: 500 kb/s is 62,500
bytes per second, 250 kb/s is 31,250, and 300 kb/s is 37,500.

Only an active, unmasked guest DMA2 request consumes a slot. Each resulting
transfer remains a native DMA grant and controller endpoint read; terminal
count and controller completion retain their existing IRQ6 behavior.
