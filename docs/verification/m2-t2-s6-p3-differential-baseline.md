# M2 T2 S6 P3 Verification: Executable Differential Baseline

## Focused Evidence

`src/integration/pcjs/differential-harness.test.ts` constructs an isolated
PCjs 80386 CPU and Busx86 oracle, plus an independent rebuilt CPU and physical
memory image. Both CPUs execute exactly one real-mode instruction per case.

The initial NOP, immediate MOV, ADD, and DEC cases matched normalized general
registers, EIP, EFLAGS, and CS/DS/ES/SS fields. No exclusion was needed.

## Scope Boundary

This evidence does not claim memory-write, port-I/O, prefix, exception,
protected-mode, descriptor, paging, or privilege comparison. Those additions
are required before S6 closure.
