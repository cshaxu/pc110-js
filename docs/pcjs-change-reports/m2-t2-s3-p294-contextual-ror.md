# M2 T2 S3 P294: Contextual ROR

## Summary

Add rotate-right flag support and route Group 2 ROR through the execution
context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. ROR rotates word or dword data according to operand size and uses
the resulting high bits for CF/OF.

## Change

The CPU state gains dedicated 16- and 32-bit ROR flag writers. The contextual
dispatcher handles Group 2 `/1` for immediate, one-bit, and CL counts, while
RCL/RCR remain on the established dispatch path.

## Verification

A default-32 test performs immediate dword ROR, operand-size-overridden word
ROR, and CL-counted dword ROR. It verifies data widths, retained high word,
and EIP lengths. The full project gate passes.

## Boundary

This part excludes RCL/RCR and byte forms, complete count-edge behavior,
paging integration, devices, firmware, PC110 behavior, and M2 T3 work.
