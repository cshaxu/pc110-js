# M2 T2 S6 P2 Verification: Differential Direction

## Reviewed Evidence

- PCjs `Computer` constructs `Busx86` around `CPUx86` and initializes devices
  through shared computer, bus, and CPU lifecycle APIs.
- The retired device-proxy proposal would therefore require a material PCjs
  compatibility shim rather than a bounded CPU-validation harness.

## Result

The owner-authorized S6 direction uses an isolated PCjs CPU oracle for
one-instruction differential validation. The project-native browser DOS
workload remains mandatory after native device migration.
