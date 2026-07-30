# M2 T2 S3 P319: Contextual Same-Privilege IRET

## Summary

Route same-privilege protected-mode IRET through the shared execution context.

## Basis

Intel IA-32 selects IRET return frame data width from the operand size while
SS D/B independently selects stack addressing. Interrupt-gate delivery owns
entry-frame width. NXVM covers IRET; PCjs remains the PC/AT comparison source.

## Change

The project-owned decoder now peeks the return selector and handles only
same-privilege protected returns through contextual pop widths. Cross-privilege
frames remain on the existing validated path.

## Verification

Focused coverage verifies `66 IRET` in a default-32 code segment, returning
from a 16-bit IP/CS/FLAGS frame through a 32-bit SS stack-address path. The
full project gate passes.

## Boundary

This part does not alter interrupt delivery, cross-privilege IRET, virtual-8086
IRET, hardware, or M2 T3 work.
