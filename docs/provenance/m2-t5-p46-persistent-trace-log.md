# M2 T5 P46 Provenance

- Authority: owner-approved Fast diagnostic retention policy and P37 durable
  output requirement.
- Contract: `PC110JS_ROM_TRACE_LOG` accepts only a project-relative file path.
  The runner creates the log before execution and appends its bounded
  diagnostic output as it occurs.
- Boundary: the log records diagnostics only. It does not change CPU, device,
  timer, firmware, media, browser, or guest behavior.
