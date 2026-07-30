# M2 T2 S6 P4 PCjs Change Report: Differential Memory Delta

## Summary

- Affected PCjs-derived subsystem: test-only Busx86 physical-memory observation.
- Changed behavior: none in PCjs or the product runtime.

## Justification

- PCjs CPU memory writes can bypass the public Busx86 setter through internal
  memory blocks.
- Before/after snapshots of isolated oracle RAM provide a stable, non-invasive
  comparison of changed memory state.

## Verification

- `MOV moffs, AL` changes the same byte in independent rebuilt and PCjs RAM.
- The P4 delta is sorted and compares state changes only; unchanged-value write
  tracing remains explicitly active work.
