# M2 T5 P124 Provenance: Control-Flow Timing

P123's bounded timing window showed repeated differences at `E2` loop and
short conditional-control instructions. The estimator compared post-execution
EIP with `DecodedInstruction.length`, which contains only prefixes and opcode
bytes. Conditional instructions therefore used an incomplete fall-through
address.

The project-native estimator now derives the complete trailing immediate size
for short and near conditional controls, normalizes the fall-through according
to the code default size, and applies PCjs's selected 80286-compatible timing:
conditional jump taken/fall-through is 7/3 and `LOOP*` is 8/4. PCjs assigns
zero cycles to prefixes, so prefix charges were also removed.

This correction is generic timing infrastructure. It does not alter execution
semantics, device scheduling, PCjs, or the normal browser product path.
