# M2 T5 P108 Provenance

- Controlled lockstep first differed at `F000:938A`, where the selected ROM
  reads CMOS port `0x71`.
- PCjs uses the host date when its documented `dateRTC` machine parameter is
  absent; the native RTC intentionally starts from a deterministic seed.
- The diagnostic-only selected-machine configuration now supplies PCjs
  `dateRTC="1990-01-01T00:00:00"` and the matching native RTC date/time.
- This keeps RTC initialization normal on each emulator and removes an
  uncontrolled host-time input from replay.
