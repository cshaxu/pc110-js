# M2 T5 P44 Verification

- ROM inspection decoded the `F000:DCA6` wait loop and its `F000:C242` helper.
- Existing native integration coverage verifies `receiveKeyboardByte()` routes
  a raw Set-1 byte through the selected 8042 to PIC IRQ1.
- Full gate: format, build, lint, tests, and `git diff --check` passed.
- Next browser evidence: reach the wait, classify the controller-enable state,
  then send a native key only after hardware admission is established.
