# M2 T5 P92 Verification

- `npm install --ignore-scripts` generated `package-lock.json` from a clean
  dependency tree using npm `10.9.4`.
- The npm full gate passed: `npm run format`, `npm run build`, `npm run lint`,
  `npm run test`, and `git diff --check`.
- The test suite passed 127 test files and 919 tests on Node `22.22.1`.
