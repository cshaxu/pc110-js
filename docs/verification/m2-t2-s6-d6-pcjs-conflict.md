# M2 T2 S6 D6 PCjs Differential Conflict

## Fixture

Real-mode `D6` at `0000:0000`, stack pointer `0x100`, and IVT vector six
target `0000:0200`.

## Observed Delta

The rebuilt CPU follows the NXVM-defined undefined-opcode path: it pushes the
real-mode fault frame, changes `ESP` from `0x100` to `0xfa`, and transfers to
`0000:0200`. The PCjs CPU oracle advances only from `EIP 0` to `EIP 1`; it
does not push a frame or dispatch vector six.

## Authority Evidence

NXVM `vcpuins.c` assigns primary opcode `0xD6` to `UndefinedOpcode()` at line
13605. The project opcode ledger P363 records the same NXVM `#UD` requirement,
and the rebuilt CPU already has focused vector-six coverage.

## Status

Resolved by owner approval on 2026-07-30. The rebuilt CPU retains the
NXVM/80386 `#UD` behavior. The approved compatibility exception is recorded
only in `docs/coverage/m2-t2-s6-differential-exclusions.md` as EXC-001; this
file remains the pre-decision conflict evidence.
