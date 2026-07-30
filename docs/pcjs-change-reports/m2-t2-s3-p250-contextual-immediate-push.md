# M2 T2 S3 P250: Contextual Immediate PUSH

## Summary

P250 routes `68` and `6A` immediate PUSH forms through the shared execution
context.

## Basis And Change

PCjs remains the behavior authority: operand size selects word or dword pushed
data and immediate length, while SS default size independently selects SP or
ESP addressing. The project-native context stack helper provides both.

## Boundaries

Other stack and control-transfer forms, devices, firmware, and PC110 behavior
remain outside P250. No PCjs JavaScript or NXVM C source was copied.
