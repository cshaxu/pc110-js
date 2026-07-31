# M2 T5 P63 Provenance

- Authority: the diagnostic checkpoint plan requires atomic core restoration,
  rather than unrelated per-device snapshots.
- Contract: `RebuiltPcAt386Core.capture()` and `restore()` include native CPU,
  mutable RAM/A20, scheduler, every attached project-native device, optional
  DeskPro timing, and pending NMI. Device restore does not invent callbacks.
- Correction: selector restoration now preserves absent optional `type` fields,
  so an architectural CPU snapshot round-trips exactly.
- Boundary: browser input queue and replay identity remain outside the core and
  must be composed by the diagnostic session layer.
