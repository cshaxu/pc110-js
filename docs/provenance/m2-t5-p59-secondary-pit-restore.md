# M2 T5 P59 Provenance

- Authority: the selected DeskPro ROM executes the second 8254 port group, so
  its counter phase and control byte must survive a bounded replay checkpoint.
- Contract: capture preserves secondary PIT internal timing state and FPU
  control observations without altering their hardware behavior.
- Boundary: this is another required device slice, not a complete machine
  checkpoint or a claim about an x87 execution engine.
