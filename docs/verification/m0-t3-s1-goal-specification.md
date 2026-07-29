# M0 T3 S1 Goal Specification Verification

## Scope

This record verifies the committed M1-to-M2 goal specification and the rules
that prevent it from silently changing active goal scope.

## Acceptance Checks

- `docs/goals/m1-m2.md` defines the authorized M1-to-M2 scope and excludes M3.
- It defines M1 and M2 outcomes, browser and standalone boundaries, records,
  snapshot transitions, and stop conditions.
- It preserves the read-only sibling, relative-path, protected-asset, English,
  TypeScript, and no-shortcut constraints.
- The agent instructions, contribution rules, and execution policy require a
  goal specification revision to remain binding during active goal execution.
- The specification contains no protected media, credentials, or absolute local
  asset path.

## Verification Commands

```powershell
git diff --check
rg --hidden -n "[^\x00-\x7F]" -g "!.git/**" .
git ls-files | rg -i "\.(img|ima|iso|rom|bin|vhd|vmdk|qcow2?)$"
```

## Result

Pass. The committed specification supplies a stable, bounded contract for an
M1-to-M2 goal without authorizing M3.
