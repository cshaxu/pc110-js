# M2 T5 P118 Provenance: PCjs I/O Timing

P117 established that the first PIT difference has equal instruction location
but native CPU time exceeds PCjs time by 331 cycles. PCjs selects its
`CYCLES_80286` table for the configured 80386 CPU model. That table assigns
five cycles to both immediate-port and DX-port input/output instructions.

The prior project-native estimator charged every I/O instruction twelve cycles.
The corrected five-cycle charge is project-native code implementing the
selected PCjs observable timing contract.

The same browser replay crossed the prior `F000:BB15` boundary and reached the
next first difference at `F000:BB19`, narrowing the remaining issue to PIT
reload phase rather than the former cumulative I/O overcharge.
