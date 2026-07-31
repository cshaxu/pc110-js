# M2 T5 P97 Provenance

- P96 required a browser-level proof that the local PCjs diagnostic control is
  not merely present in source or a generated bundle.
- The direct same-origin wrapper is the appropriate evidence surface because
  it uses the exact generated HTML, machine XML, XSL configuration, and
  uncompiled PCjs bundle that the development page references.
