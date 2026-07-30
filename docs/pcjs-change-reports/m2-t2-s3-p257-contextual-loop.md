# M2 T2 S3 P257: Contextual LOOP Family

## Summary

P257 routes `E0..E3` through the shared execution context.

## Basis And Change

PCjs remains the behavior authority: CS default address size and 67 select CX
or ECX for LOOP, LOOPE, LOOPNE, JCXZ, or JECXZ. The code-segment cache remains
the source of IP or EIP target width. Existing EFLAGS predicates are unchanged.
