# M2 T5 P134 Provenance: Segment Cache Hot Path

A bounded CPU profile identified `cloneSegment()` in instruction fetch and
segmented-memory translation as a frequent allocation source. Public CPU state
reads must remain independent copies for snapshots and callers, but internal
CPU execution only reads the currently owned cache.

The CPU state now exposes an internal readonly cache view for executor and
segmented-memory use. Public `readSegment()` remains cloning. Fast execution
also skips tracepoint construction when no trace hook exists. No descriptor,
segment, translation, fault, or snapshot behavior is changed.
