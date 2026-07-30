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

## P2 Counter State Core

P2 implements a local binary 8254-style state model from component protocol and
timing semantics. It contains no host clock, PCjs import, firmware response, or
machine coupling; later parts own port and IRQ wiring.

## P3 PC/AT Wiring

P3 exports project-native 8-bit PIT port ranges and composes them with the
rebuilt machine's local PIC. Counter-0 output is the sole IRQ source; counter-2
remains a signal only. No PCjs device, scheduler, firmware, or browser audio is
used.

## P4 Browser Checkpoint

P4 presents only local PIT reset outputs beside the existing CPU and PIC
snapshot. It does not schedule PIT ticks, attach host audio, or load protected
firmware or media.
