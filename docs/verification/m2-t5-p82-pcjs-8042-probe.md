# M2 T5 P82 Verification

- `node --check machines/pcx86/modules/v2/chipset.js` and the local PCjs ESLint
  binary passed in the `pc110` branch.
- `git diff --check` passed for the PCjs probe edit.
- The PCjs repository has no project test script. Its `package.json` declares a
  deliberately failing placeholder, so browser probe capture remains the next
  runtime validation rather than a waived behavior claim.
- The pc110-js full gate is run after its tracking and provenance updates.
- A future short paired run must enable `pc110Probe=true`, read the bounded
  tuple tail, and compare actual 8042 transaction ordering with the native tail.
