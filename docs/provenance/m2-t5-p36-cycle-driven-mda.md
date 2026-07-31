# M2 T5 P36 Provenance

- PCjs is a read-only timing comparison source: its video implementation
  identifies MDA status bits 0 and 3 as retrace signals and documents its own
  excluded VGA diagnostic workaround.
- Product behavior is original TypeScript timing driven only by guest CPU
  cycles. No host time, firmware edit, timer shortcut, or synthetic interrupt
  is introduced.
