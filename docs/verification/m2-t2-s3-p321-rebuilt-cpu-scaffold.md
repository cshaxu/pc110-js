# M2 T2 S3 P321 Verification: Rebuilt CPU Scaffold

## Scope

The scaffold creates no active execution path. The legacy CPU remains the
machine runtime and differential reference.

## Focused Coverage

- Rebuilt reset state exposes the 80386 reset vector, reset CS cache, CR0, and
  EDX value without importing legacy CPU code.
- Rebuilt register aliases preserve 8-bit, 16-bit, and 32-bit write behavior.
- Prefix decoding selects one non-default size for repeated `66` or `67` and
  handles default-16 and default-32 inputs.

## Gate Result

The full project gate passed after Prettier formatting: build, lint, and all
21 test files with 388 tests. `git diff --check` is required before commit.
