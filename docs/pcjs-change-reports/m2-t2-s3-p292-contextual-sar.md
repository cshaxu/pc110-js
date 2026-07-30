# M2 T2 S3 P292: Contextual SAR

## Summary

Add arithmetic-right-shift flag support and route Group 2 SAR through the
execution context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. SAR performs signed right shifts; operand size selects word or
dword data and address size selects the ModR/M effective address.

## Change

The CPU state gains dedicated 16- and 32-bit SAR flag writers. The contextual
Group 2 helper now handles `/7` for immediate, one-bit, and CL counts, with
explicit 16-bit sign extension before shifting.

## Verification

A default-32 test performs immediate dword SAR, operand-size-overridden word
SAR, and CL-counted dword SAR. It verifies sign propagation, preserved high
word, and EIP lengths. The full project gate passes.

## Boundary

This part excludes Group 2 rotations and byte forms, complete count-edge
behavior, paging integration, devices, firmware, PC110 behavior, and M2 T3
work.
