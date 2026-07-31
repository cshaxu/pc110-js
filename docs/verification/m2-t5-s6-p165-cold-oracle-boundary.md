# M2 T5 S6 P165 Cold Oracle Boundary Verification

## Check

- The M1 selected DeskPro XML contains `ramLow test="false"`.
- P151's M2 diagnostic XML requires `ramLow test="true"`.
- PCjs's documented `test="false"` behavior writes the BDA warm-boot marker
  and bypasses the ROM memory test.

## Result

The M1 `A:\\>` result remains valid reference-integration evidence, but it is
not evidence that a no-shortcut native cold POST should reach the same boundary
within the same execution window. The standalone M2 DOS requirement remains
unchanged.
