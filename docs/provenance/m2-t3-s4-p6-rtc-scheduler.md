# M2 T3 S4 P6 Provenance

- Behavioral authority: the existing project-native MC146818 32,768 Hz model
  and its selected PC/AT IRQ8 composition.
- Comparison source: the pinned read-only PCjs RTC/CMOS planning record.
- Product change: `CycleScheduler` now carries a separate RTC fractional
  remainder and `RebuiltPcAt386Core` applies emitted RTC ticks.
