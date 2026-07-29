# M1 T2 S3 Runtime Dependency Verification

## Scope

This record verifies the selected reference machine's firmware, media, browser,
and build dependencies.

## Evidence

- Each listed PCjs path exists in pinned commit
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- `machines/machines.json` lists PCx86 v2 browser modules and XSL resources.
- The known-good local floppy is 1,474,560 bytes and matches its recorded
  SHA-256 identity.
- Default COMPAQ and PCjs catalog media are classified as excluded from the M1
  boot proof.

## Verification Commands

```powershell
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs cat-file -s c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/releases/2.25/pcx86.js
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/machines.json
Get-FileHash ../fdd.img -Algorithm SHA256
Get-Item ../fdd.img | Select-Object Length
```

## Result

Pass. M1 has a complete local dependency identity without committing PCjs ROMs,
browser runtime, archive media, or the protected DOS floppy.
