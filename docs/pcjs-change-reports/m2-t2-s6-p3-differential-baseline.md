# M2 T2 S6 P3 PCjs Change Report: Executable Differential Baseline

## Summary

- Affected PCjs-derived subsystem: test-only CPUx86 and Busx86 oracle loading.
- Changed behavior: none in PCjs or the product runtime.

## Justification

- The harness needs a real PCjs 80386 execution result for each isolated guest
  instruction.
- Dynamic test-only loading preserves the project-owned runtime boundary while
  avoiding a copied or proxy-adapted PCjs CPU.

## Verification

- Independent RAM and real-mode state execute NOP, immediate MOV, ADD, and DEC
  once on each CPU and compare normalized results.
- P3 has no approved divergence exclusions.
- Memory, I/O, prefixes, faults, and protected-mode comparisons remain active
  P4+ scope.
