# M2 T5 P122 Provenance: Far Transfer Timing

P121's cold lockstep replay identified the reset-vector `EA` far jump as the
first cycle-only difference: native charged seven cycles and PCjs charged
eleven while architectural state remained equal.

The project-native estimator had incorrectly grouped near and far control
transfers. PCjs's selected 80286-compatible timing table distinguishes a far
jump (11 cycles) and far call (13 cycles) from the seven-cycle near forms.
This correction changes only machine-time scheduling charges.
