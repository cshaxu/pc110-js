# M0 T3 S1 Agent Guidance Verification

## Scope

This record verifies the root agent guidance added for long-running execution.
It does not authorize emulator implementation or advance the M1 work state.

## Acceptance Checks

- The repository root contains the standard `AGENTS.md` file.
- The file is smaller than 32 KiB and applies to the complete repository.
- It points to canonical planning and governance documents instead of copying
  mutable project status.
- It preserves the English-only artifact rule, TypeScript runtime rule,
  read-only reference boundary, protected-asset boundary, M/T/S/P commit format,
  verification requirement, and prioritized TODO format.
- It prevents an M1 goal from continuing into M2 unless the owner explicitly
  authorizes the broader scope.
- All changed Markdown links resolve to tracked repository files.
- All changed artifacts contain ASCII text only.
- No protected media or emulator implementation source is added.

## Verification Commands

```powershell
git diff --check
rg --hidden -n "[^\x00-\x7F]" -g "!.git/**" .
git ls-files | rg -i "\.(img|ima|iso|rom|bin|vhd|vmdk|qcow2?)$"
```

Markdown links were also checked against repository-relative file paths, and
the `AGENTS.md` byte length was checked directly.

## Result

Pass. The guidance is repository-wide, bounded by the canonical project
documents, and introduces no implementation or protected asset content.
