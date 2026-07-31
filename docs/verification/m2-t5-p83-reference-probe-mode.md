# M2 T5 P83 Verification

- `pnpm run build` passed.
- Probe-mode HTTP verification on port 5198 returned the temporary machine XML
  with `pc110Probe="true"` and ChipSet source containing `pc110ProbeEvents`.
- Normal-mode HTTP verification on port 5199 returned the pinned machine XML
  without the probe attribute and pinned ChipSet source without the probe
  marker.
- The in-app browser rejected the local reference URL with
  `ERR_BLOCKED_BY_CLIENT`; no emulator or probe mismatch was inferred from that
  environment limitation. A future short paired browser run remains required
  before interpreting transaction differences.
