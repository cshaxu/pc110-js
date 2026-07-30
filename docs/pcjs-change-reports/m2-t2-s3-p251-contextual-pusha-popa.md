# M2 T2 S3 P251: Contextual PUSHA And POPA

## Summary

P251 routes `60` and `61` through the shared execution context.

## Basis And Change

PCjs remains the behavior authority: CS default size and 66 select PUSHA/POPA
or PUSHAD/POPAD register width, while SS default size independently selects
stack addressing. The project-native context helper preserves the original
stack-pointer value in the pushed frame and discards the POPA stack slot.

## Boundaries

Other stack, control-transfer, device, firmware, and PC110 behavior remains
outside P251. No PCjs JavaScript or NXVM C source was copied.
