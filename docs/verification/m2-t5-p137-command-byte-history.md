# M2 T5 P137 Verification: PCjs Command-Byte History

- The local PCjs `pc110` branch rebuilt its uncompiled `2.25` diagnostic bundle
  and the bundle contains `pc110ProbeCommandBytes`.
- PC110JS reference-assets tests require both the source contract and the
  rendered diagnostic payload field.
- Existing browser evidence confirms the reference reaches command byte `45`
  after the native machine remains at `5D`; detailed transition comparison is
  the following diagnostic action.
