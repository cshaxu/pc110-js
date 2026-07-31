# M2 T5 P130 Verification: Segment-Move Timing

- Decoder tests retain ModR/M form for register and memory `0x8E` encodings.
- Cycle-estimator tests distinguish the PCjs-observed two-cycle register and
  three-cycle memory classes.
- Scheduler coverage locks the selected 16 MHz PCjs PIT boundary: 2,816 CPU
  cycles produce 209 PIT ticks, and the next cycle produces the 210th.
- A cold browser lockstep replay crosses the former `F000:9C05` PIT0 count
  difference. Seventy-two bounded windows (1,152 instruction boundaries)
  remain architecturally and timing matched.
