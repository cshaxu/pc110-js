# M0 T3 S1 Milestone Snapshot Verification

## Scope

This record verifies the process that preserves M1 through M5 completion
states as remote snapshot branches before the next milestone starts.

## Acceptance Checks

- Each completed delivery milestone uses the exact branch name `m<milestone>`.
- The snapshot branch is created from the final verified `main` commit and
  pushed to `origin` before next-milestone implementation begins.
- Creation verifies that local `main`, the local snapshot branch, and the
  matching remote branch resolve to the same commit.
- The active task tracking section and milestone verification record capture
  the branch, remote push, and verification result. Git ref equality remains
  the authority for commit identity.
- Development remains on `main`, and snapshot branches are not moved, merged,
  or used for development without explicit owner authorization.
- A cross-milestone goal transition requires both explicit goal authorization
  and the completed preceding snapshot process.

## Verification Commands

```powershell
git diff --check
rg --hidden -n "[^\x00-\x7F]" -g "!.git/**" .
git ls-files | rg -i "\.(img|ima|iso|rom|bin|vhd|vmdk|qcow2?)$"
```

## Result

Pass. The snapshot protocol preserves milestone states without changing the
main-branch development workflow or introducing protected assets.
