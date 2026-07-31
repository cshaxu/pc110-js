# M2 T5 P72 Provenance

- Trigger: the browser automation surface cannot synthesize a focused native
  `KeyboardEvent`, while the selected firmware is intentionally waiting for a
  real keyboard-buffer entry at `F000:DCA6`.
- Contract: the development-only control enqueues the Set-1 make and break
  bytes for `KeyA` through the same browser queue used by `window` key events.
- Authority correction: PCjs models `NO_INHIBIT` as a keyboard data-line state
  but gates ordinary scan-code admission on `NO_CLOCK`. Native BAT remains a
  two-line transition, while scan codes may enter with command byte `0x45`.
- Boundary: the control exists only with `?dev-media=1`; it does not call the
  CPU, PIC, 8042, BDA, BIOS, DOS, or guest-memory interfaces directly.
