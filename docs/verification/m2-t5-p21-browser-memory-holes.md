# M2 T5 P21 Verification: Browser Memory Holes

Focused tests assert the browser checkpoint's unpopulated physical and I/O
buses return `0xFF` and ignore writes. Manual browser run with validated local
ROM and floppy remains running from `F000:B5B5` through `F000:B5EC`, without
the former `0xE0000` or `0x4B` unmapped-bus exceptions.
