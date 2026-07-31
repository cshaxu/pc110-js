# M2 T5 P79 Provenance

- Reassessment: PCjs defines the generic 8042 interface-test success value as
  `0x00`.
- Selected ROM flow: its `0x00` branch performs keyboard reset, waits for ACK
  and BAT, and enables the keyboard. The `0x05` comparison is part of a
  distinct error-report path, not an affirmative success contract.
- Correction: P74's selected `0x05` override was an overinterpretation of the
  ROM comparison. Browser and reference-ROM construction now use the native
  generic `0x00` default.
