# M2 T5 P27 Untraced Execution Evidence

The browser product path does not enable a CPU trace, but previously created
complete CPU snapshots for every instruction in the executor, runner, and
machine HLT checks. P27 replaces timing's snapshot dependency with explicit
before/after EIP values and uses direct state access in the untraced core loop.

Manual browser validation with the three validated local media files remained
running at `C000:069C` after approximately twelve seconds and paused cleanly.
The one-million-instruction selected-ROM trace still completes at `C000:01FB`
with the same recorded VGA-ROM transfers. This is not a real-time performance
claim or a DOS-boot claim.
