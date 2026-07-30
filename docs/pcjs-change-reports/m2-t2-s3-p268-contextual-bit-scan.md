# M2 T2 S3 P268: Contextual BSF And BSR

## Summary

Route `0F BC/BD` through the project-native execution context.

## Basis

PCjs remains the behavioral authority. Intel 80386 operand-size selects the
BSF/BSR source and destination width, while address-size selects the ModR/M
effective-address form. A zero source sets ZF and leaves the destination
unchanged.

## Change

The former dword-only helper now accepts an operand and address size. The
context dispatcher handles both two-byte opcodes without copied PCjs code.

## Verification

Focused default-32 coverage verifies an unprefixed dword memory scan plus a
`66` and `67` prefixed word scan through 16-bit addressing, including register
width and EIP. Existing tests retain dword lowest/highest scans, zero-source
destination preservation, and ZF. The full project gate passes.

## Boundary

This slice excludes other two-byte opcode families, segment overrides, devices,
firmware, PC110, and M2 T3 work.
