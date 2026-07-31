# M2 T5 P140 Verification: PCjs 8042 Event History View

- Reference-assets coverage requires the page to expose the existing full
  bounded `pc110ProbeEvents` array.
- The page does not alter PCjs probe capacity, CPU, devices, ROM, media, or
  scheduler behavior.
- The next bounded PCjs browser run must correlate the `0x5D -> 0x4D` history
  entry with its surrounding port events before a native behavior correction is
  considered.
