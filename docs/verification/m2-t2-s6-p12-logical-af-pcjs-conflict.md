# M2 T2 S6 P12 Logical AF PCjs Differential Conflict

## Fixture

Real-mode program prefix `05 01 00 0D 02 00 15 01 00 1D 01 00 25 FF 00` with
initial `EAX = 0xfffe` and `EFLAGS = 0x00000002`. The mismatch occurs after
the final `AND AX, 00FFh` logical instruction.

## Observed Delta

Both CPUs produce `AX = 0x00fe` and `EIP = 0x000f`. The rebuilt CPU reports
`EFLAGS = 0x00000012`, preserving AF from the earlier arithmetic instruction;
the PCjs oracle reports `EFLAGS = 0x00000002`, clearing AF.

## Authority Evidence

NXVM defines `AND_FLAG` at `../nxvm/src/device/vcpuins.c:3184` as only
`SF | ZF | PF`; `_kaf_set_flags()` therefore leaves AF unchanged. The rebuilt
logical helper has the same explicit undefined-AF policy. PCjs differs.

## Status

Resolved by owner approval on 2026-07-30. The rebuilt CPU retains its
NXVM-aligned behavior. EXC-002 in the project-wide compatibility register
contains the sole approved exception entry; this file remains conflict evidence.
