# M2 T5 P135 Provenance: PIT Edge Hot Path

A bounded native CPU profile identified PIT advancement and garbage collection as
remaining Fast Execution costs. `PcAtPit` needs only whether a counter produced
at least one rising edge for cycle-driven advancement; it does not consume an
edge list.

The 8254 retains its existing edge-list API for general observation. A separate
project-native boolean edge API serves the cycle-driven PC/AT adapter, avoiding
three transient arrays per instruction without changing counter advancement,
phase reset, or IRQ0 delivery.
