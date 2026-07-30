# M2 T5 S5 P4 PCjs Change Report: Unpopulated I/O

PCjs defines unregistered I/O reads as `0xFF` and writes as ignored. This part
adds an original TypeScript port-bus policy and selects it only for the rebuilt
machine composition. It does not import PCjs code or introduce a device,
firmware, or guest shortcut.
