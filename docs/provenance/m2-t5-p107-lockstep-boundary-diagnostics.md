# M2 T5 P107 Provenance

- A same-media short ROM window reached a first EFLAGS mismatch after 66
  matching instructions, but the coordinator status did not retain the exact
  instruction boundary needed for a bounded replay.
- Existing native and PCjs snapshots already contain CS, EIP, EFLAGS, and
  virtual-cycle data. The coordinator now returns those fields before and after
  every accepted instruction without adding an execution trace subsystem.
