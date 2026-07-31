# M2 T5 P87 Provenance

- PCjs `embedPCx86()` is its supported HTML embedding API and is used by PCjs
  saved-machine pages.
- PCjs `components.xsl` explicitly constructs the ChipSet parameter object and
  omits unknown XML attributes. Diagnostic XML alone therefore could not enable
  P82's probe.
- The same opt-in Vite response now changes only its temporary XSL text to use
  release `2.25` and append `pc110Probe:true` to the ChipSet parameter object.
- The generated page publishes only the existing bounded `pc110ProbeEvents`
  tail and component identifiers. It changes no PCjs device, CPU, timing, or
  media behavior.
