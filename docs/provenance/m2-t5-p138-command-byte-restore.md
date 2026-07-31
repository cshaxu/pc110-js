# M2 T5 P138 Provenance: PCjs 8042 Restore Transition

P137's first browser observation produced an empty command-byte history while
the final command byte was `0x45`. Source inspection established that the
initial state is restored through a direct assignment in PCjs `restore()`.

P138 makes that state boundary observable. It is evidence gathering only; no
native device behavior changes until the resulting PCjs and native histories
are compared.
