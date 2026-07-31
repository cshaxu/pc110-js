# M2 T5 P140 Provenance: PCjs 8042 Event History View

P139 shows the native ROM reaches `0x10 -> 0x5D` and then repeats 8042
diagnostic traffic without writing `0x4D`. P138 proves PCjs reaches
`0x10 -> 0x5D -> 0x4D -> 0x45`.

The PCjs probe already retains 256 events, but the diagnostic page rendered
only its final 32. P140 exposes that existing bounded array read-only so the
transaction preceding each recorded transition can be compared without another
long replay or any PCjs runtime change.
