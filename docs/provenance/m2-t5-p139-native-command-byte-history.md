# M2 T5 P139 Provenance: Native 8042 Command-Byte History

The P138 PCjs same-media run established the command-byte sequence
`0x10 -> 0x5D -> 0x4D -> 0x45`. The native browser exposes only the current
byte and a short raw port tail, which cannot prove whether a missing later
state results from a missing write or from subsequent device behavior.

P139 adds a bounded native transition history at the existing PC/AT keyboard
adapter boundary. It records actual byte changes after normal port operations,
is retained in diagnostic checkpoints, and changes no guest-visible behavior.
