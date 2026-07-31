# M2 T5 S6 P147 PCjs Batch Lockstep Control

## Summary

- Affected PCjs-derived subsystem: local `pc110`-branch ChipSet diagnostic
  control plane.
- Source provenance record: PCjs PCx86 v2, local `pc110` branch, diagnostic
  release `2.25` uncompiled bundle.
- Changed behavior: when `pc110Lockstep` is explicitly enabled, expose
  `stepBatch(maxInstructions)` alongside the existing paused one-instruction
  control.
- Active milestone need: efficiently locate the first native/PCjs selected-ROM
  machine difference without routine long per-instruction browser replay.

## Justification

- Configuration is insufficient because the existing control exports only one
  instruction per browser boundary.
- A pc110-js adapter cannot batch PCjs CPU work without a PCjs-owned paused
  execution entry point.
- The operation uses the same positive instruction budget and timer update
  sequence as the established one-step control. It retains only before/after
  snapshots and caps a call at 4096 instructions.
- Compatibility risk is limited to an opt-in local diagnostic surface. Normal
  PCjs machine execution, CPU semantics, device behavior, ROM bytes, and
  scheduling remain unchanged.

## Implementation Boundary

- Source: `../pcjs/machines/pcx86/modules/v2/chipset.js` on branch `pc110`.
- Destination: `src/reference/lockstep-coordinator.ts` and the browser-only
  diagnostic bridge.
- The PCjs method does not select native handlers, copy PCjs state into the
  native machine, or enter a product runtime path.
- Generic PC/AT impact: none outside an explicitly configured diagnostic
  ChipSet.
- PC110-specific impact: none; the `pc110` name is local diagnostic provenance.

## Verification

- Focused tests cover batch comparison, deterministic reset replay, native
  batch stepping, and required PCjs diagnostic-bundle content.
- `gulp concat/pcx86` regenerated the local uncompiled diagnostic bundle.
- The full PC110JS gate remains required before the paired commit.
- Browser validation will use one reusable diagnostic tab and no more than two
  tabs if an active paired comparison requires both.

## Future Path

- Reduction: remove the opt-in control and its bundle assertion when M2 no
  longer needs whole-machine differential diagnosis.
- Upstream contribution: not proposed; this is project-local diagnostic API.
- Deferred work: use the batch control to locate the current BIOS divergence,
  then retain only tests and evidence needed for that resolved difference.
