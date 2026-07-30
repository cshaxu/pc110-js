# M2 T2 S3 P289: Contextual Bit Tests

## Summary

Route register-index BT, BTS, BTR, and BTC forms through the execution
context.

## Basis

PCjs remains the behavioral authority and Intel 80386 remains the semantic
requirement. Operand size selects the bit-field width and signed register index
interpretation; address size selects the ModR/M base address for memory forms.

## Change

A project-native contextual helper performs register- or memory-target bit
tests and mutations. For memory register-index forms it expands the signed bit
index by word or dword units before accessing the selected target.

## Verification

A default-32 BTS test uses index 33 to update the next dword. A `67 66` BTC
test uses index 15 through a 16-bit direct address. Both verify memory bytes
and prefix-aware EIP lengths. The full project gate passes.

## Boundary

This part excludes the `0F BA` immediate-bit group, complete bit-operation
fault behavior, paging integration, devices, firmware, PC110 behavior, and
M2 T3 work.
