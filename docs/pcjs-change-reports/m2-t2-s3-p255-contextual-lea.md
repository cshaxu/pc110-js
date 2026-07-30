# M2 T2 S3 P255: Contextual LEA

## Summary

P255 routes `8D` through the shared execution context.

## Basis And Change

PCjs remains the behavior authority: CS default size and 66 select destination
register width, while CS default size and 67 select ModR/M effective-address
width. The project-native path reuses the shared decoders without memory access.
