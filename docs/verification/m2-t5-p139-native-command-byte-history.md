# M2 T5 P139 Verification: Native 8042 Command-Byte History

- Focused adapter coverage proves the real `0x60` writes record
  `0x10 -> 0x5D -> 0x4D` without introducing a synthetic controller response.
- Adapter capture and restore preserve the bounded diagnostic history without
  replaying IRQ, output-port, or reset callbacks.
- Checkpoint coverage exposes a formatted command-byte transition and confirms
  reset clears it while Fast Execution remains free of port-tail formatting.
- The full project gate must pass before commit. The next browser diagnostic
  compares this native sequence with P138's PCjs sequence.
