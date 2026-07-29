# Emulated Time And Host Scheduling

`EmulationClock` is the sole owner of emulated cycle count. It advances only
when the machine explicitly supplies a nonnegative cycle delta and resets only
at a machine reset boundary.

Browser and Node hosts may implement `HostScheduler` to request an execution
slice, but they cannot advance emulated time themselves. Wall-clock duration,
animation frames, timers, and throttling therefore affect responsiveness only,
not deterministic device or CPU behavior.

M2 CPU and devices will consume the same clock through machine-owned execution
slices. Tests advance it explicitly and must not depend on elapsed host time.
