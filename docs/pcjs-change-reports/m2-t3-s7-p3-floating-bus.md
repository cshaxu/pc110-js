# M2 T3 S7 P3 PCjs Change Report: Selected Floating Bus

PCjs empty physical blocks read as `0xFF` and ignore writes. Original
TypeScript physical memory now exposes that only as an explicit option; strict
unmapped-access errors remain the default. The selected ROM trace uses it and
reaches the next unimplemented I/O write at `0xF1`, without synthesized RAM,
ROM, port, firmware, storage, display, DOS, or PC110 behavior.
