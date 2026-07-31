# M2 T5 P84 PCjs Change Report: Executable Probe Bundle

## Basis

P83 initially proved that diagnostic mode served the instrumented module source,
but normal PCjs machines load a versioned release bundle. Serving a modified
module alone was therefore insufficient runtime evidence.

## PCjs Branch Change

The local PCjs `pc110` branch regenerates
`machines/pcx86/releases/2.25/pcx86-uncompiled.js` from the already committed
probe source. The diagnostic reference server alone injects `uncompiled="true"`
and temporarily changes its XSL release selector to `2.25`, so that this
generated bundle is executed.

## Boundary

The generated file and XSL selection exist only for the opt-in diagnostic path.
The normal pinned PCjs baseline, PCjs main branch, and the standalone product
runtime are unchanged. The bundle adds observation only; it has no emulator
behavior change.
