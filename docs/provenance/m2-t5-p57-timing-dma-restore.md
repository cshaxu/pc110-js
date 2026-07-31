# M2 T5 P57 Provenance

- Authority: P55's keyboard-queue mismatch requires a short deterministic
  replay from a real atomic checkpoint, not another routine long trace.
- Contract: PIT, DMA, RTC/CMOS, and port `0x61` capture all internal state
  that changes subsequent emulated execution, without consulting host time.
- Boundary: this extends P56's input/interrupt slice. It is not a complete
  machine checkpoint or a user-facing save-state feature; FDC, video, serial,
  and other machine state remain pending.
