# M2 T5 P126 Provenance: PIT Mode 3

After P125, CPU state and virtual cycles matched PCjs at `F000:BB27` but PIT0
was one visible count behind. PCjs's selected mode-3 timer representation
decrements the visible count by two per PIT input tick. The project-native
counter had decremented it once.

The native mode-3 state machine now applies double-counting, including the
odd-count carry into the next half-period. This is generic 8254 mode behavior,
not a BIOS address or device scheduling exception.
