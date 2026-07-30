# M2 T2 S6 P7 Verification: Declared Differential Ports

The harness configures a declared 16-bit port at `0x81` with deterministic
input `0xbeef`. The `ED EF` DX-addressed word I/O program passes lockstep: the
first step reads `0xbeef`; the second writes that result back to the same port.
Both access records include the 16-bit width.
