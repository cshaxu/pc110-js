# M1 T3 S3 Verification: Runner Diagnostics

## Result

Pass.

## Checked Failure Boundaries

- A missing sibling checkout produces `Missing sibling PCjs checkout`.
- An absent pinned object or selected source produces an explicit baseline and
  machine-unavailable message.
- An absent local floppy produces `Missing local DOS floppy: ../fdd.img`.
- An incorrect floppy size reports the observed byte count.
- A hash mismatch reports the observed SHA-256 before the server listens.

## Validation

The successful local run rechecked the normal path after these diagnostics were
made explicit. All validation occurs before `createServer()`.
