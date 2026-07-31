# M2 T5 P84 Provenance

- PCjs `machine.xsl` selects `pcx86-uncompiled.js` when a machine carries
  `uncompiled="true"`.
- The selected PCjs XSL default release was `2.23`, while the local PCjs `pc110`
  branch's pcx86 release configuration is `2.25`.
- The regenerated `2.25` uncompiled bundle contains the committed P82
  `pc110ProbeEvents` instrumentation.
- Diagnostic HTTP validation confirmed all four required links: temporary
  machine uncompiled mode, temporary probe setting, XSL `2.25` selection, and
  probe marker inside the served uncompiled bundle.
