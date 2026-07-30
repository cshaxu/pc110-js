# M2 T5 S1 P6 Verification: Cycle-Accounted Trace Recovery

Focused tests cover native cycle estimates, exact PIT fractional carry, reset,
invalid scheduler input, and the early-80386 control-register MOD-field forms.
The selected 70,000-instruction ROM trace crosses the protected-mode far jump
to `0018:87AA` and returns to `F000:87DC`. The full quality gate must pass
before this part is committed.
