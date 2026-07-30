# M2 T3 S2 PIT Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs `chipset.js` PIT definitions,
  port map, IRQ0 wiring, and timer-2 speaker-clock relation.
- Product code: project-native TypeScript only; PCjs source, device, runtime,
  firmware, media, and browser resources are excluded.

## Initial Scope

The PIT owns `0x40-0x43`, deterministic counter state, IRQ0 signaling, and a
counter-2 output signal. The system-port `0x61` speaker gate remains T3 S5, and
browser audio remains outside the device core.
