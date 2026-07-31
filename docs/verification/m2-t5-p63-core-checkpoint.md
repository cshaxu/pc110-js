# M2 T5 P63 Verification

- The focused core test captures, mutates, restores, compares every component,
  then services a restored pending NMI and executes the following instruction.
- The full repository gate, including format, build, lint, test, and
  `git diff --check`, must pass before commit.
