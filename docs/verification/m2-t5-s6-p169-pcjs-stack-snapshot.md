# M2 T5 S6 P169 PCjs Stack Snapshot Verification

## Check

- The PCjs `pc110` branch changes only the diagnostic `esp` snapshot field.
- The field now reads the PCjs architectural stack pointer through `getSP()`.
- The selected ROM's `PUSH DX` boundary is replayed through the existing cold
  reset, batch, and single-step diagnostic path.

## Result

The corrected cold replay crossed `F000:A8D4`. The next first difference is
the independent CMOS-data read at `F000:B546`, confirming that the prior ESP
report was solely the stale diagnostic projection. Subsequent differences
remain subject to the same deterministic replay and project-native repair
process.
