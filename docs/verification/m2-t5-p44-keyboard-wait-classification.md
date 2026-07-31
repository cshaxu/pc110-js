# M2 T5 P44 Verification

- ROM inspection decoded the `F000:DCA6` wait loop and its `F000:C242` helper.
- Existing native integration coverage verifies `receiveKeyboardByte()` routes
  a raw Set-1 byte through the selected 8042 to PIC IRQ1.
- Full gate: format, build, lint, tests, and `git diff --check` passed.
- Next browser evidence: reach the wait, send a native key, and record the
  resulting firmware transition without a long trace.
