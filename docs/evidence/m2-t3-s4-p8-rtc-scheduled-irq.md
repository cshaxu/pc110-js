# M2 T3 S4 P8 Scheduled RTC IRQ Evidence

A three-cycle native CPU instruction is scheduled as one RTC second in a
controlled profile. With native RTC periodic interrupts enabled, that single
execution boundary sets RTC status C periodic and IRQ flags and raises the
native slave PIC IRQ8 request.

The test exercises the project-owned CPU scheduler, RTC, and PIC wiring. It
does not inject an interrupt, use host time, or depend on firmware behavior.
