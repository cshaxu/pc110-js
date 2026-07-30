# M2 T2 S3 P278: Contextual LEAVE

## Summary

Route `C9` through the project-native execution context and correct the shared
contextual stack word-address behavior.

## Basis

PCjs remains the behavioral authority. LEAVE first aligns SP or ESP from BP or
EBP using the SS address-size attribute, then pops BP or EBP using operand
size. Intel 80386 separates stack-address width from popped data width.

## Change

The context dispatcher now implements LEAVE through the existing contextual
stack boundary. That boundary now explicitly passes a 32-bit SS address for
16-bit word reads and writes when SS is 32-bit.

## Verification

Focused default-32 coverage verifies dword LEAVE and a `66` word LEAVE with a
high 32-bit SS address, including BP/EBP, SP/ESP, and EIP. The full project gate
passes.

## Boundary

This slice excludes ENTER migration, stack faults, segment overrides, devices,
firmware, PC110, and M2 T3 work.
