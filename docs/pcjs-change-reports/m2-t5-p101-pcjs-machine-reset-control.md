# M2 T5 P101 PCjs Change Report: Paused Machine Reset Control

## Basis

The controlled-lockstep contract requires a reset operation, but a CPU-only
reset would leave PC/AT device state, bus state, and component reset ordering
different from normal PCjs behavior. PCjs already provides `Computer.reset()`
as the ordinary whole-machine reset path.

## Change

Add an opt-in `resetMachine` operation to the existing paused PCjs lockstep
control. It rejects a running CPU and otherwise delegates directly to the
existing `Computer.reset()` method, then returns the normal diagnostic
snapshot. It does not duplicate, reorder, or replace PCjs reset behavior.

## Boundaries

The operation exists only when `pc110Lockstep=true` on the local PCjs `pc110`
branch. It is diagnostic control, not a product runtime dependency, ROM/BIOS
workaround, synthetic device response, or state-loading facility.
