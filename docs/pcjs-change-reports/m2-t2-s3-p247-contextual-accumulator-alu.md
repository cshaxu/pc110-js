# M2 T2 S3 P247: Contextual Accumulator ALU

## Summary

P247 routes accumulator-immediate ADD, OR, ADC, SBB, AND, SUB, XOR, and CMP
through the shared execution context.

## Basis

PCjs remains the behavior authority: CS default size and 66 select the data
width and immediate length for these accumulator instructions.

## Change And Boundaries

The shared path selects word or dword accumulator, immediate, arithmetic flags,
and instruction length. ModR/M immediate forms, devices, firmware, and PC110
work remain outside this part. No PCjs or NXVM source was copied.
