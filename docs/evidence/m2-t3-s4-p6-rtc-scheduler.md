# M2 T3 S4 P6 RTC Scheduler Evidence

The MC146818 RTC is a native deterministic device but must receive its
32,768 Hz tick source while the machine executes. P6 adds an independent exact
fractional conversion from the selected CPU cycle rate to RTC ticks and routes
nonzero results through the existing native RTC-to-IRQ8 path.

No host wall clock, BIOS service, DOS behavior, or synthetic firmware response
is introduced. The selected profile retains its independent PIT clock domain.
