# M2 T2 S6 Differential Validation Correction

## Decision

The owner replaced the proposed PCjs-device-proxy handoff with a test-only
lockstep CPU differential harness. The rebuilt TypeScript CPU and an isolated
PCjs CPU oracle execute one instruction each from independently initialized
equivalent state. The harness compares normalized architectural state, memory
and I/O effects, exceptions, and fault return EIP.

## Rationale

PCjs device initialization materially depends on PCjs Busx86, CPUx86, and
computer lifecycle APIs. Recreating that compatibility layer would obscure CPU
validation and become an unbounded hidden device-runtime implementation.

## Required Triage

For an unexpected difference, minimize the fixture, inspect the corresponding
NXVM handler and ledger entry, and correct only the TypeScript CPU. If an
NXVM-aligned result still differs from PCjs, record the exact fixture and full
normalized delta, then stop for owner direction. An exclusion requires a
case-by-case record; it cannot be inferred from a family-level summary.

## Preserved Completion Gate

The later M2 standalone browser DOS workload remains mandatory. It must run
through the project-owned CPU, memory, and native PC/AT device implementations;
neither PCjs CPU nor PCjs devices may be a product-runtime dependency.
