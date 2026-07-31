# M2 T2 P415 Provenance

- A same-media controlled ROM replay first diverged at `F000:F9B4`, whose bytes
  begin `32 C0` (`XOR AL, AL`). Native EFLAGS retained AF (`0x56`); PCjs cleared
  it (`0x46`).
- Intel documents AF as undefined for logical instructions. NXVM keeps it
  undefined, so it remains the structural and semantic reference for that
  architecture boundary.
- M2 requires PCjs-compatible observable behavior. PCjs deliberately clears AF
  for AND, OR, TEST, and XOR based on hardware observations, so the project
  adopts that deterministic policy for the same logical instruction family.
