# M2 T5 P93 Verification

- Focused tests cover normalized reset state, one NOP instruction with exact
  native cycle accounting, and a halted boundary with no virtual-time advance.
- The full npm gate validates the adapter and existing machine behavior.
- This part supplies only the native diagnostic endpoint. It does not claim a
  PCjs-normalized snapshot, equivalent reset state, or a cross-machine result.
