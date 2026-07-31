# M2 T5 P91 PCjs Change Report: Controlled Lockstep Step Surface

## Basis

The existing PCjs debugger `stepCPU(0, ...)` provides a visible single-step
operation but intentionally suppresses ordinary hardware interrupts. It cannot
be the reference operation for whole-machine lockstep replay.

PCjs `CPUx86.stepCPU(1)` executes one instruction budget without that debugger
suppression. Its normal caller updates chipset timers before execution and CPU
timers after the consumed cycles. A diagnostic-only wrapper can preserve this
ordering while reporting actual consumed cycles.

## Change

On the local PCjs `pc110` branch only, the opt-in chipset-owned diagnostic
control object appears when `pc110Lockstep=true` is configured. It requires
the CPU to be paused and provides one normal instruction-budget operation,
virtual-cycle reporting, and a small boundary snapshot. The control object
does not modify PCjs's normal Run, Reset, debugger, or device paths when
disabled.

## Boundaries

The change is not a PC110 device implementation, product dependency, browser
feature, timing shortcut, or source transfer into PC110JS. It is a test-only
control plane for short differential windows. CPU/device snapshots, reset
equivalence, and cross-machine coordination remain subsequent parts after the
step contract is independently verified.
