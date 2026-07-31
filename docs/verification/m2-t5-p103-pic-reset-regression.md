# M2 T5 P103 Verification

- Added the native lockstep-adapter regression assertion for the P102 PIC
  pre-ICW snapshot state.
- A full fail-fast npm gate passes after the assertion, preserving the P102
  observable reset-state correction without rewriting published `main` history.
