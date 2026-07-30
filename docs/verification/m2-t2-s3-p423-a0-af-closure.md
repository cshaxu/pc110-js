# M2 T2 S3 P423 Verification: A0-AF NXVM Handler Closure

Focused tests cover moffs load/store and accumulator TEST default sizes with
independent `66/67`, all generic string opcode forms, REP zero-count behavior,
and protected invalid-DS `#GP` fault delivery at the instruction-start EIP.
The complete project gate passed: format, build, lint, tests, and whitespace
verification.
