# M2 T5 P109 Provenance

- Controlled same-media lockstep reached `F000:F94F` after matching entry
  state and identified the first difference after `CMP word ptr [E000:0000],55AAh`.
- Native EFLAGS `0x86` corresponds to the configured `0xFFFF` physical-hole
  word; PCjs EFLAGS `0x97` corresponds to a zero word and is consistent with
  the selected PCjs memory-block behavior.
- P112 supersedes this soft-reset inference. Its paused pre-execution PCjs
  probe establishes `0xFF` for both `C8000` and `E0000`; selected unmapped
  reads therefore remain `0xFF` while ignored writes remain unchanged.
