# M2 T5 P93 Provenance

- P91 proved a paused PCjs instruction boundary, but its small diagnostic
  snapshot cannot yet be compared directly with the native machine.
- The native side therefore exposes CPU state and virtual cycles directly from
  project-owned checkpoint and machine boundaries. It does not parse browser
  presentation text, import PCjs, or alter product execution.
- Interrupt and NMI admission are reported explicitly as non-instruction
  boundaries so a later coordinator cannot mislabel them as decoded CPU work.
