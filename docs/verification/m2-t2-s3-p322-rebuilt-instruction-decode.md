# M2 T2 S3 P322 Verification: Rebuilt Instruction Decode

## Focused Coverage

- CS D/B supplies the default operand and address sizes.
- `66` and `67` each select the non-default size once.
- The last segment and repeat prefixes are retained in the decoded instruction.
- Fourteen prefixes plus one opcode form a valid 15-byte instruction.
- Fifteen prefixes fail with the original instruction-start EIP.

## Gate Result

Focused rebuilt decoder tests passed before the full project gate. The full
project gate then passed: build, lint, `git diff --check`, and all 22 test
files with 391 tests.
