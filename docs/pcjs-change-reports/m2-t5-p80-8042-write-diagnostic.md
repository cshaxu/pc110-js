# M2 T5 P80 PCjs Change Report: 8042 Write Diagnostic

## Basis

PCjs is used as a behavior authority for the 8042. Its source is not changed,
copied, or executed by this diagnostic.

## Project Change

The project-native browser checkpoint now displays a bounded writes-only tail
for 8042 data and command ports alongside the existing mixed port tail.

## Boundary

This is observability only. It neither changes 8042 protocol behavior nor adds
trace snapshots, timing shortcuts, or guest-service behavior.
