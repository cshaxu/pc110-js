# M2 T2 S6 Differential Exclusions

This is the sole register of approved compatibility exceptions for the M2 T2
S6 PCjs differential gate. Do not record an approved exception only in a test,
tracking entry, verification note, or PCjs change report.

Every entry must identify one minimized instruction fixture, the normalized
rebuilt and PCjs deltas, relevant NXVM handler and ledger location, the reason
the difference remains, the owner decision, and its test treatment. A
family-level statement is not an exclusion. A new unreviewed difference remains
a stop condition under the S6 plan.

## EXC-001: Real-Mode D6 Undefined Opcode

- Fixture: real-mode `D6` at `0000:0000`, `ESP = 0x100`, with IVT vector six
  targeting `0000:0200`.
- Rebuilt result: NXVM-aligned `#UD` delivery pushes the real-mode fault frame,
  changes `ESP` from `0x100` to `0xfa`, and transfers to `0000:0200`.
- PCjs result: advances `EIP` from `0` to `1` without a vector-six transfer or
  stack write.
- NXVM and project evidence: `../nxvm/src/device/vcpuins.c:13605` assigns
  primary opcode `0xD6` to `UndefinedOpcode()`. Ledger P363 requires rebuilt
  vector-six delivery for D6.
- Owner decision: approved on 2026-07-30. Preserve the NXVM/80386 `#UD`
  behavior; do not modify the rebuilt CPU to match PCjs.
- Test treatment: retain the minimized conflict fixture as evidence. It is an
  explicit expected PCjs divergence and is not a passing lockstep case.
- Scope: real-mode primary opcode `D6` only. This entry does not exclude
  `D8-DF`, protected-mode undefined-opcode behavior, or any other difference.
