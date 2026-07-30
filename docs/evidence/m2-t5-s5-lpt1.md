# M2 T5 S5 LPT1 Evidence

- Focused tests cover all three ports, reset, control readback, status
  normalization, ACK clearing, transmit observation, byte-width rejection, and
  IRQ7 composition.
- The selected ROM trace remains a whole-machine regression after LPT1 is
  composed. Its current 1,000,000-instruction window completes at `F000:C666`;
  it does not exercise the configured port in that bounded window.
