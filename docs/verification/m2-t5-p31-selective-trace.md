# M2 T5 P31 Verification

- Focused CPU tests prove selected ordinary boundaries preserve architectural
  state and that a selector miss still retains the true pre-fault snapshot.
- Focused machine tests prove selected tracing preserves port output, stop
  result, and final CPU state relative to Fast Execution while retaining port
  and stop events.
- A 1,000-instruction selected-ROM watch reached `F000:9C05` and hit
  `F000:FFF0` once under Selective Trace.
- The full project quality gate is required before commit.
