# M2 T5 S1 P7 PCjs Change Report: PC/AT Refresh Status

PCjs treats port `0x61` refresh state as an observable PC/AT system-control
signal. Original TypeScript now exposes the existing native PIT channel-1
output at bit 4. It imports no PCjs chipset, timer, firmware, or audio code.
