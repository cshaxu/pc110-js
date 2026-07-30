# M2 T2 S3 P281: Contextual System Selectors

## Summary

Route `0F 00` selector instructions through the shared execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Prefix decoding selects the ModR/M effective-address size. SLDT,
STR, LLDT, and LTR transfer selector values, so their data width remains
16-bit.

## Change

The existing project-native system-selector helper now accepts its ModR/M
offset and effective-address width. The contextual two-byte opcode dispatcher
uses those values after prefix decoding. Existing protected-mode privilege,
descriptor, and task-register behavior is unchanged.

## Verification

A focused test runs LLDT in a default-32 code segment, then uses `67 SLDT`
with a 16-bit direct memory address. It verifies the loaded LDTR cache, stored
selector bytes, and exact EIP advances. The full project gate passes.

## Boundary

This part does not complete system instruction coverage, descriptor fault-code
detail, task switching, debug registers, paging integration, devices,
firmware, PC110 behavior, or M2 T3 work.
