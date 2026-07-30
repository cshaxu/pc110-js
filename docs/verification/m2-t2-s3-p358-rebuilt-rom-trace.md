# M2 T2 S3 P358 Verification: Rebuilt Selected-ROM Trace

`pnpm run trace:rebuilt-rom` reads the pinned local DeskPro ROM and stops after
two rebuilt instructions at `F000:F907` on unsupported `E6` (`OUT`). No port
response or synthetic device behavior is introduced.

Focused runner and direct-far-JMP tests pass. The full project gate passed:
format, build, lint, `git diff --check`, and all tests.
