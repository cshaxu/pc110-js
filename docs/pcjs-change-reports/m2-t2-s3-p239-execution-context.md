# M2 T2 S3 P239: Execution Context Foundation

## Summary

P239 adds a project-native, side-effect-free decoder for instruction execution
defaults and prefix boundaries. It does not route any existing opcode family
through the new context yet.

## Basis

PCjs is the behavioral authority for selecting data and address size from the
active code segment and instruction prefixes. The Intel 80386 requirement is
that 66 and 67 select the non-default width for the instruction. The owner
explicitly authorized repeated prefixes as one selection rather than a
cumulative toggle.

## Change

The context records the instruction-start EIP, opcode offset, selected operand
and address sizes, independent SS stack address size, segment override, repeat
prefix, and LOCK presence. It is core-only TypeScript and has no machine,
firmware, device, UI, PC110, BIOS, DOS, or guest-service behavior.

## Risk And Containment

The new decoder is not used by the execution dispatcher in P239, so existing
instruction behavior, fault routing, trace hooks, and device interfaces remain
unchanged. Focused tests cover both CS defaults, prefix combinations, SS
independence, instruction length accounting, and preserved instruction-start
EIP. Later parts must migrate families explicitly and may not infer generic
32-bit-default support from a 66-prefixed path.

## Source Boundary

This implementation is original TypeScript. PCjs and NXVM were consulted only
for behavioral and structural guidance; no JavaScript or C source was copied.
