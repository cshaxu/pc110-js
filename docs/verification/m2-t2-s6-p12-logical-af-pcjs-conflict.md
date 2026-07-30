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

This is not an approved compatibility exception. Per the owner-approved S6
rule, further differential expansion stops until the owner decides whether the
NXVM-aligned behavior remains and receives a scoped exception entry, or the
governing policy changes.
