# M2 T5 P121 Provenance: Instruction Timing Evidence

P120 aligned device visibility with PCjs but the next first difference retained
a native `856` versus PCjs `889` CPU-cycle gap. Both lockstep endpoints already
return their completed instruction cycle charges.

The coordinator now retains those values as read-only per-boundary evidence.
It does not alter instruction execution, device scheduling, or comparison
admission.

Browser replay identified the first timing difference at the reset-vector
`EA` far jump: native charged seven cycles while PCjs charged eleven. The
architectural state remained equal.
