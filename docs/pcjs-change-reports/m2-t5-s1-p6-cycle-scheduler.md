# M2 T5 S1 P6 PCjs Change Report: Cycle-Accounted Trace Recovery

PCjs provides the behavioral evidence that early 80386 `MOV CR` instructions
ignore ModR/M MOD, including the selected DeskPro ROM, and it schedules PIT
state from accumulated CPU cycles. Original TypeScript now has a native
cycle-result/scheduler boundary and the scoped `0F20/0F22` behavior. It imports
no PCjs source, runtime, timer callback, firmware, media, or browser logic.
