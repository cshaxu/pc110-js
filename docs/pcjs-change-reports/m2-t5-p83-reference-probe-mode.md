# M2 T5 P83 PCjs Change Report: Reference Probe Mode

## Basis

The P82 PCjs probe lives only on the local `pc110` branch, while the reference
server intentionally serves the immutable upstream baseline. A diagnostic run
therefore needed an explicit, contained way to select the local probe branch
without weakening ordinary baseline verification.

## Project Change

`PC110JS_REFERENCE_PC110_PROBE=1` selects a diagnostic-only reference-server
mode. It requires the sibling PCjs checkout to be on `pc110`, verifies the
probe marker, serves the local worktree, and injects `pc110Probe="true"` into
the temporary local machine XML. Normal mode remains pinned to PCjs
`c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.

## Boundary

This is a verification server, not product code. It does not change the
standalone runtime, import PCjs into its browser bundle, or make PCjs a device
fallback. It only creates a bounded transaction tail for an explicitly chosen
diagnostic run.
