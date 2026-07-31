# M2 T5 P90 Provenance

- Owner corrected the M2 comparison method: wall-clock parallel execution is
  insufficient for strict whole-machine differential diagnosis.
- Existing M2 T2 evidence already uses an isolated one-instruction PCjs CPU
  oracle. The new diagnostic extends the method to selected whole-machine
  replay windows with explicit virtual work and device state.
- PCjs's CPU and debugger sources provide stepping and timer-update paths that
  require a narrowly scoped diagnostic control surface rather than browser
  scheduling observation.
