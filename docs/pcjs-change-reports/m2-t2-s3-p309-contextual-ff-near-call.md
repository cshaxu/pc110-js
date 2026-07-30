# M2 T2 S3 P309: Contextual FF Near Call

## Summary

Route FF /2 near calls through the shared execution-size context.

## Basis

Intel IA-32 selects the near-call target and pushed return data width from the
operand size while SS D/B independently selects stack addressing. NXVM covers
FF Group 5 near calls. PCjs remains the PC/AT comparison source.

## Change

The project-owned contextual decoder now handles FF /2 register and memory
targets. It obtains the target before changing the stack, pushes the complete
next instruction pointer at the selected data width, then loads IP or EIP.

## Verification

Focused coverage verifies a default-32 register call and a 66-selected word
call on the same default-32 SS stack-address path. The full project gate
passes.

## Boundary

This part does not migrate FF jumps, far calls, devices, or M2 T3 work.
