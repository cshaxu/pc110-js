# M2 T5 P32 Provenance

- Authority: owner-authorized trace workflow correction following the
  interrupted long Selective Trace diagnostic.
- Product impact: none. This record changes verification workflow only; it
  adds no CPU, firmware, device, timing, or runtime dependency behavior.
- Diagnostic boundary: Fast long runs retain replay identity and bounded
  checkpoints. A mismatch or unexpected boundary is investigated by a bounded
  Full Debug replay from the nearest verified checkpoint.
