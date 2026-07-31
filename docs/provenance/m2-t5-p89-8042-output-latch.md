# M2 T5 P89 Provenance

- PCjs `in8042OutBuff()` returns its retained output-data latch and clears only
  the output-buffer status bits.
- The paired browser probe observed the selected firmware read `0x55` after
  the controller self-test, write `0xAD`, then read `0x55` again while OBF was
  no longer asserted.
- The native 8042 previously discarded the byte when the guest consumed OBF.
  The correction keeps a separately snapshot-restorable data latch while OBF
  validity remains represented by the output-buffer state.
