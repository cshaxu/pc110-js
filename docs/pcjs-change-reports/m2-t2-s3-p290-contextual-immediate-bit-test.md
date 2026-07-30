# M2 T2 S3 P290: Contextual Immediate Bit Tests

## Summary

Route the `0F BA` immediate BT/BTS/BTR/BTC subgroup through the contextual
bit-test helper.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. The immediate bit index is one byte; operand size selects the
target width and address size selects the preceding ModR/M address encoding.

## Change

The contextual dispatcher validates `/4` through `/7`, derives the immediate
byte position from the decoded effective-address length, and delegates to the
shared contextual bit-test implementation.

## Verification

A default-32 BTS test sets bit 31 through a 32-bit direct address. A `67 66`
BTC test clears bit 15 through a 16-bit direct address. Both verify memory
bytes and prefix-aware EIP lengths. The full project gate passes.

## Boundary

This part does not complete all bit-operation fault behavior, paging
integration, devices, firmware, PC110 behavior, or M2 T3 work.
