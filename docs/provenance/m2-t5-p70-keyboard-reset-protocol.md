# M2 T5 P70 Provenance

- Trigger: selected-ROM disassembly shows `F000:CF06` sends keyboard reset
  `0xFF`, then waits for `0xFA` and `0xAA` before issuing controller enable
  `0xAE`. The native keyboard omitted reset entirely and dropped a second
  immediate response behind the single 8042 output buffer.
- Contract: project-native keyboard reset returns ACK followed by BAT, and the
  PC/AT adapter retains pending keyboard bytes until guest reads free the
  controller output buffer.
- Boundary: no BIOS/BDA writes, synthetic input, timer delay, or runtime PCjs
  dependency is introduced.
