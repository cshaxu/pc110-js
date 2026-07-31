# M2 T5 P72 Verification

- Focused adapter coverage verifies that command byte `0x45` admits a Set-1
  scan code and requests IRQ1 although its data-inhibit bit remains clear.
- Unit coverage retains Set-1 make/break conversion and queue back-pressure.
- Format, build, lint, full test suite, and `git diff --check` pass.
- Browser verification must show the control visible only in development mode
  and advancing the native firmware from the keyboard-buffer wait through the
  existing input path.
