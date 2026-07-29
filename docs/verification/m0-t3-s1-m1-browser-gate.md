# M0 T3 S1 M1 Browser Gate Verification

## Scope

This record verifies the governance change that makes a manually usable browser
reference run a required M1 result. It does not claim that M1 is implemented.

## Acceptance Checks

- M1 requires a pc110-js-owned command that serves and opens the selected
  read-only PCjs reference machine in a browser.
- M1 requires a visible DOS prompt in that browser and a concise, manually
  verified reference-mode guide.
- The new requirement distinguishes M1 reference mode from the M2 standalone
  TypeScript emulator and preserves the root `QUICKSTART.md` requirement for M2.
- Browser controls, relative paths, local-asset validation, and read-only
  sibling behavior are explicit requirements.
- No PCjs runtime source or protected media is added.

## Verification Commands

```powershell
git diff --check
rg --hidden -n "[^\x00-\x7F]" -g "!.git/**" .
git ls-files | rg -i "\.(img|ima|iso|rom|bin|vhd|vmdk|qcow2?)$"
```

## Result

Pass. M1 now has a browser-accessible, owner-reproducible reference-mode
completion gate without changing its non-standalone implementation boundary.
