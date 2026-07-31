# M2 T5 P135 Verification: PIT Edge Hot Path

- Focused 8254 and PC/AT PIT regressions pass, including the boolean terminal
  edge result and PC/AT IRQ0 routing.
- The bounded 100,000-instruction selected-ROM benchmark completed at
  `F000:B5B7` in about 712 ms, compared with about 721 ms for P134's baseline
  on the same host.
- This part changes no ROM, BIOS, keyboard, synthetic delay, or PCjs runtime
  behavior. Browser workload validation remains the next T5 activity.
