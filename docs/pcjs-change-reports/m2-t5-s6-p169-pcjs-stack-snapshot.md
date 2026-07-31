# M2 T5 S6 P169 PCjs Stack Snapshot Normalization

## Summary

- Affected PCjs subsystem: local `pc110`-branch ChipSet diagnostic snapshot.
- Source: `../pcjs/machines/pcx86/modules/v2/chipset.js`.
- Change: report `esp` through `cpu.getSP()` instead of the stale backing
  register `cpu.regESP`.
- Need: cold lockstep first localized a post-`PUSH DX` ESP difference at
  `F000:A8D4` while EIP and virtual cycles matched.

## Justification

PCjs maintains a linear internal stack pointer (`regLSP`) for segmented stack
access. Its CPU contract explicitly requires external consumers to use
`getSP()` for the current architectural stack pointer. `pushWord()` updates
`regLSP`, so exporting `regESP` reported a pre-push value despite correct PCjs
execution. The diagnostic must compare architectural state, not a private
cache.

## Boundary And Risk

The modification is active only when the existing `pc110Lockstep` opt-in
diagnostic surface is configured. It does not alter PCjs CPU execution, stack
memory writes, timers, devices, ROMs, normal browser execution, or product
runtime dependencies. No state is transferred to the native machine.

## Verification

- The P169 browser replay must cross `F000:A8D4` with matching architectural
  ESP and retain the existing one-million-boundary first-difference protocol.
- Regenerate the local uncompiled PCjs diagnostic bundle before replay.
- Run the PC110JS full gate before the paired project commit.

## Future Path

Remove this diagnostic-only PCjs control with the rest of the lockstep bridge
after M2 no longer requires whole-machine differential diagnosis. No upstream
submission is proposed.
