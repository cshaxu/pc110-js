# M2 T2 S3 P240: Contextual Immediate And Stack Slice

## Summary

P240 routes `B8..BF` and `50..5F` through the shared execution context. It is
the first guest-visible use of CS-selected operand width and SS-selected stack
address width.

## Basis

PCjs remains the behavioral authority for code-segment default data size,
prefix overrides, and independently selected stack addressing. Intel 80386
semantics require a 32-bit push or pop to carry dword data even when a 16-bit
stack address selects SP rather than ESP.

## Change

The implementation decodes the context before dispatch, handles only the
selected immediate MOV and register stack opcodes, and leaves all segment
override, REP/REPNE, and LOCK-prefixed paths in their existing handlers. Stack
helpers preserve upper ESP bits when SS selects 16-bit stack addressing.

## Verification

Focused execution tests cover default-32 `MOV r32, imm32`, its 66-selected
16-bit form, and a default-32 push/pop round trip using a 16-bit SS stack that
wraps at `0xffff`. Existing full regression tests remain required.

An existing register-stack regression now declares the 16-bit CS default it
already required: its 66 prefixes select dword operands only from that default.

## Boundaries

This is not general 32-bit-default support. ModR/M, immediate groups, string
operations, control transfer, and all device and PC110 work remain separate
future migration parts. No PCjs JavaScript or NXVM C source was copied.
