# M2 T5 P102 Provenance

- A natural browser reset-boundary comparison first differed at the master PIC
  mask: the native reset exposed `0xFF`, while PCjs exposed no pre-ICW PIC
  register value.
- PCjs initializes its PIC objects with an empty initial register array. Its
  IMR, IRR, and ISR become defined when the guest sends ICW1, not at machine
  reset.
- The native 8259 now retains that observable pre-ICW state, while byte reads
  and arithmetic use the same zero coercion as PCjs's bitwise paths.
