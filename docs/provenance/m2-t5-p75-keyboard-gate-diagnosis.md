# M2 T5 P75 Provenance

- Browser observation: both queued A and F1 attempts leave the selected core
  with command byte `0x5D`, keyboard disabled, and scan admission disabled.
- Native contract: the 8042 accepts ordinary scan bytes only after `NO_CLOCK`
  is released. PCjs applies the same clock gate to keyboard data admission.
- Correction: the earlier inference that A had been consumed was not supported
  by the controller state. The ROM's progress must be diagnosed through its
  own 8042/reset sequence, without injecting or forcing keyboard input.
