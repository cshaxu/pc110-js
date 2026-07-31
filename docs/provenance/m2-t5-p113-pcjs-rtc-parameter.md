# M2 T5 P113 Provenance

- Cold controlled replay first differed at `F000:938A` after `IN AL,0x71`.
  Native returned the fixed seed's zero seconds while PCjs returned host-time
  seconds.
- PCjs `components.xsl` reads `@dateRTC` from the `<chipset>` element, not
  the machine root. The prior wrapper placed the value on the root and did not
  reach the ChipSet constructor.
- The wrapper now injects the same fixed ISO value into the selected chipset;
  no PCjs source, CPU, RTC device, or guest behavior is modified.
