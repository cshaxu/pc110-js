# M2 T5 P94 Provenance

- P93 made native CPU and virtual-cycle state available at a project-owned
  diagnostic instruction boundary.
- The PCjs `pc110` branch now exposes copies of its existing CPU architectural
  state through the opt-in lockstep snapshot, permitting a later adapter to
  compare like fields without scraping browser presentation.
- PCjs is the behavioral comparison authority. The source change is isolated
  to its diagnostic ChipSet control and its regenerated uncompiled bundle.
