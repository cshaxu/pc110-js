# M2 T5 P87 PCjs Change Report: Effective Diagnostic Probe

## Basis

P86 served a probe-enabled XML attribute and the instrumented bundle, but PCjs
`components.xsl` whitelists chipset parameters. The attribute never reached the
actual ChipSet instance, leaving its probe disabled.

## Change

No PCjs repository file changed. The opt-in diagnostic response uses PCjs's
own HTML embedding API and temporarily appends `pc110Probe:true` to the XSL
ChipSet parameter expression. A wrapper serializes the existing bounded probe
tail for read-only browser inspection.

## Boundary

Only `node scripts/serve.mjs --pcjs-reference` enables this response. Normal
reference mode, PCjs branches, product builds, and project-native emulation are
unchanged.
