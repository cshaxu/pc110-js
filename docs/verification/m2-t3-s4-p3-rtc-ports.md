# M2 T3 S4 P3 Verification: RTC/CMOS Ports

Focused port tests validate `0x70`/`0x71` access, address bit 7 retention, and
explicit event-triggered IRQ8. Rebuilt-machine tests validate native PIC wiring
and RTC reset state. The full quality gate passes without a host clock, NMI,
firmware, storage, or browser-workload claim.
