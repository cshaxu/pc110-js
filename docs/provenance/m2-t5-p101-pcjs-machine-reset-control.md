# M2 T5 P101 Provenance

- The controlled-lockstep contract requires both endpoints to start a replay
  window through their ordinary whole-machine reset paths.
- PCjs `Computer.reset()` remains the PCjs authority for component ordering;
  the native endpoint uses its established `NativeCoreCheckpoint.reset()` path.
- The coordinator invokes neither private register mutation nor device-state
  synthesis. It immediately compares the resulting observable snapshots.
