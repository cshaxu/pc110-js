# M2 T2 S3 P297: NXVM Undefined Opcodes

## Summary

Route NXVM's explicit post-80386 TODO opcode entries through the established
project-native invalid-opcode fault path.

## Basis

NXVM `vcpuins.c` maps `WBINVD`, `WRMSR`, `RDMSR`, `CPUID`, and `RSM` to handlers
that call `UndefinedOpcode()`. Intel IA-32 requires an invalid-opcode fault for
these unsupported opcodes on the selected 80386 model. PCjs remains the PC/AT
and whole-machine comparison reference.

## Change

The prefix-aware two-byte decoder recognizes `0F 09`, `0F 30`, `0F 32`, `0F A2`,
and `0F AA` and delivers vector 6 using the instruction's original EIP.

## Verification

Focused real-mode tests cover all five opcodes, including a `66`-prefixed RSM
case, and verify the vector target, stack location, and saved faulting EIP.

## Boundary

This part does not implement cache control, MSRs, CPUID leaves, SMM, or any
post-80386 processor capability.
