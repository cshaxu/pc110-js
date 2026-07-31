# M2 T5 P119 Provenance: PIT Reload Phase

P118 crossed the prior first difference and reached `F000:BB19`. PCjs timer
observation showed channel one loaded at cycle `852` and remained at count
`18` after only twelve elapsed cycles. The previous native scheduler shared a
global PIT fractional remainder across all counters, allowing a newly loaded
counter to consume a partial tick from before its load.

The native PC/AT PIT now owns a fractional CPU-cycle remainder per counter and
starts a loaded counter on the following instruction boundary, matching the
PCjs timer-start contract without changing the global machine clock.

Browser lockstep crossed the prior `F000:BB19` boundary. The next first
difference is `F000:BB26`, where native CPU time is `849` and PCjs CPU time is
`882`; the remaining PIT count difference follows that CPU timing gap.
