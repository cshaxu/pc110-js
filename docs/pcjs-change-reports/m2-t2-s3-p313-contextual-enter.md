# M2 T2 S3 P313: Contextual ENTER

## Summary

Route ENTER stack-frame construction through the shared execution-size context.

## Basis

Intel IA-32 selects ENTER frame data width from the operand size while SS D/B
independently selects stack addressing; ENTER's allocation immediate is always
16 bits. NXVM includes nested ENTER support. PCjs remains the PC/AT comparison
source.

## Change

The project-owned contextual decoder now constructs ENTER frames using existing
stack and segmented-memory boundaries, including nested-frame copies.

## Verification

Focused coverage verifies default-32 EBP frames and 66-selected BP frames on
the same default-32 SS stack address path. The full project gate passes.

## Boundary

This part does not change LEAVE, far control transfer, hardware, or M2 T3 work.
