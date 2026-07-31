# M2 T5 P130 Provenance: Segment-Move Timing

P129 correctly observed a three-cycle PCjs charge for the memory form of
`MOV Sreg,r/m16` at `F000:9BFD`. A later bounded replay exposed the common
register form `8E D8`: PCjs charges two cycles while the native estimator
charged three. The decoder now retains the already-needed ModR/M shape for
`0x8E`, so the project-owned estimator selects the generic register or memory
class without ROM-address rules.

The same cold replay then held CPU cycles equal but exposed a mode-3 PIT0
count one tick early. PCjs defines `TIMER_TICKS_PER_SEC` as the integer
`1193181`; the selected native profile had used `1193182`. The profile now uses
the PCjs constant, preserving the existing generic rational conversion and
reload-relative phase model.
