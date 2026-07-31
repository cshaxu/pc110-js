# M2 T5 P100 Provenance

- P98 and P99 made a bounded, matched selected-device observation contract
  available from the native and PCjs diagnostic endpoints.
- The project-owned comparator now applies those fields after established CPU
  state, preserving a deterministic first-difference result across CPU and
  selected devices.
- JSON's `null` encoding for an absent PCjs 8042 output buffer is normalized to
  the native absent-buffer representation; no hardware state is excluded.
