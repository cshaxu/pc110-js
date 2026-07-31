# M2 T5 P125 Provenance: ModR/M Timing

P124 removed control-flow timing differences but retained measured forms from
the selected ROM: accumulator TEST, CLI, LMSW, group-one arithmetic, moffs
MOV, ModR/M MOV and CMP, group-three TEST, and group-five near jump.

The decoder now publishes a read-only ModR/M shape only for these
timing-sensitive opcode families. The project-native estimator uses that shape
to distinguish register and memory PCjs timing classes. It also corrects the
string range so `A8` and `A9` remain accumulator TEST operations.

No address is special-cased. Decode metadata is observational and execution
continues to use its own readers and instruction handlers.
