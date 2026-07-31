# M2 T5 P109 Provenance

- Controlled same-media lockstep reached `F000:F94F` after matching entry
  state and identified the first difference after `CMP word ptr [E000:0000],55AAh`.
- Native EFLAGS `0x86` corresponds to the configured `0xFFFF` physical-hole
  word; PCjs EFLAGS `0x97` corresponds to a zero word and is consistent with
  the selected PCjs memory-block behavior.
- The DeskPro-only physical-memory profile now supplies zero for unallocated
  reads while preserving ignored unallocated writes. Generic memory remains
  strict unless a caller explicitly requests another policy.
