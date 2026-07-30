# M2 T2 S3 P253: Contextual Near CALL And RET

## Summary

P253 routes `E8`, `C2`, and `C3` through the shared execution context.

## Basis And Change

PCjs remains the behavior authority: operand size selects relative displacement
and pushed or popped return data width, while SS default size independently
selects stack addressing. The project-native implementation preserves caller
cleanup for `RET imm16`.

## Boundaries

Far transfers, privilege transitions, devices, firmware, and PC110 behavior
remain outside P253. No PCjs JavaScript or NXVM C source was copied.
