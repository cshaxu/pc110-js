# M2 T2 S3 P293: Contextual ROL

## Summary

Add 32-bit rotate-left flag support and route Group 2 ROL through the execution
context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. ROL rotates word or dword data according to operand size and
updates CF/OF without changing the other flags.

## Change

The CPU state gains a 32-bit counterpart to the existing rotate flag writer.
The contextual dispatcher handles Group 2 `/0` for immediate, one-bit, and CL
counts, while ROR/RCL/RCR remain on the established dispatch path.

## Verification

A default-32 test performs immediate dword ROL, operand-size-overridden word
ROL, and CL-counted dword ROL. It verifies data widths, retained high word,
and EIP lengths. The full project gate passes.

## Boundary

This part excludes ROR/RCL/RCR, byte forms, complete count-edge behavior,
paging integration, devices, firmware, PC110 behavior, and M2 T3 work.
