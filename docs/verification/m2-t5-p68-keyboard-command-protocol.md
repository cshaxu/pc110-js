# M2 T5 P68 Verification

- Focused adapter coverage verifies BAT, `0xED` acknowledgement and parameter
  acknowledgement, `0xF5` scan disable, `0xF4` scan enable, output-buffer
  reads, and IRQ1 delivery.
- Existing core integration now configures the real command byte `0x09`,
  consumes BAT, and verifies raw keyboard input arrives through IRQ1.
- Full format, build, lint, test, and `git diff --check` gates must pass before
  commit. Browser revalidation follows this implementation part.
