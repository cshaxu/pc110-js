# M2 T5 P74 Verification

- Focused controller, adapter, and machine-profile tests preserve the generic
  `0x00` result and verify the selected `0x05` result through mapped ports.
- The full gate passed: formatting, build, lint, the full test suite, and
  `git diff --check`.
- Browser validation reached the prior `F000:DCA6` keyboard-error wait again.
  A real queued `KeyA` was consumed through the native input path but the ROM
  returned to its F1-only wait. The interface-test result is therefore not the
  sole cause of the selected ROM's error path.
