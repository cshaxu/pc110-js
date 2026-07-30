# M2 T5 P21 PCjs Change Report: Browser Memory Holes

## Summary

- Affected PCjs-derived subsystem: generic PC-compatible physical memory bus.
- Changed behavior: browser checkpoint unpopulated physical and I/O reads return
  `0xFF`, and writes are ignored.
- Active milestone need: the selected DeskPro ROM probes the empty `0xE0000`
  expansion-ROM hole before later firmware execution.

## Justification

The project-native Node ROM trace already validates this selected-machine
profile. Browser execution previously threw at the same expansion-ROM probe and
DeskPro secondary-PIT probe, creating an inconsistent runtime rather than a
stricter hardware model. This is a generic unpopulated-bus rule, not a
firmware, DOS, PC110, or guest-service workaround.

## Implementation Boundary

Only `NativeCoreCheckpoint` configures the browser-selected machine profile.
`PhysicalMemory` strict defaults remain available to focused tests and other
machine compositions.

## Verification

Focused checkpoint tests cover the `0xE0000` and `0x4B` floating reads and
ignored writes. Manual browser verification must proceed from both ROM probes
without unmapped-bus exceptions.
