# M2 T2 S3 P323 Verification: Rebuilt ModR/M Addressing

## Focused Coverage

- Register-direct forms do not manufacture a memory operand.
- 16-bit direct addressing and BP-derived forms select the required DS or SS
  default segment.
- 32-bit direct, SIB, scale, signed displacement, and stack-base forms produce
  the required effective address and default segment.

## Gate Result

Focused rebuilt ModR/M tests passed before the full project gate. The full
project gate then passed: build, lint, `git diff --check`, and all 23 test
files with 394 tests.
