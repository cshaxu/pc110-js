# M2 T2 S3 P330: Rebuilt Frame And Immediate Slice

The rebuilt CPU executes `60`, `61`, and `68-6B`: PUSHA/POPA, immediate PUSH,
and signed three-operand IMUL. It uses project-native register, stack, ModR/M,
and segmented-memory boundaries.

No PCjs runtime behavior changes. `62-67` and `6C-6F` remain separate,
documented dependencies for exception delivery, protected selector behavior,
and I/O execution, so this is not a full `60-6F` completion claim.
