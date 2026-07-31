# M2 T5 P56 Provenance

- Authority: P55 is the concrete mismatch that activates the planned bounded
  replay workflow.
- Contract: capture/restore is side-effect-free for PIC arbitration, 8042
  command/output-buffer state, keyboard BAT state, and output-port bits.
- Boundary: this is one necessary slice of atomic machine restoration. It does
  not yet capture RAM-adjacent devices, timing peripherals, media, video, or
  browser input, and it creates no user-facing save-state feature.
