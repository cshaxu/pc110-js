# M2 T2 S3 P327 Verification: Rebuilt First Opcode Interval

Focused coverage exercises every base ALU category, CMP non-writeback,
default-16 plus `66`/`67` dword memory arithmetic, segment override, four
adjust opcodes, and real-mode segment push behavior.

The full project gate passed: build, lint, `git diff --check`, and all 27 test
files with 405 tests.
