# M1 T1 S4 Reference-Run Boundary Verification

## Scope

This record verifies the planned M1 source and media boundary. It does not
implement the runner or select the reference machine.

## Evidence

- The pinned Git object exposes the complete PCx86 source tree without requiring
  sibling worktree checkout or mutation.
- PCjs machine XML references `/machines/pcx86/xsl/machine.xsl` and other
  root-relative resources, so the project-owned server must present the pinned
  source tree at its virtual HTTP root.
- The selected DeskPro 386 candidate XML shows that PCjs FDC configuration
  supports `autoMount` objects with `name` and `path` properties.
- PCjs v2 FDC source contains both auto-mount handling and browser-local
  `Choose File` and `Mount` support.
- The known-good floppy hash remains
  `FADEB3A27C6A0E1CF582DDE0B9AECB7E5D30678F2F967F2F4562F167CC0CB1D5`.

## Accepted Boundary

The M1 runner will serve browser resource requests from the pinned Git object
through a normalized, repository-relative virtual path boundary. It will not
serve files from the sibling worktree HEAD. Local protected media will be
validated and exposed only through project-owned handling, never committed.

## Verification Commands

```powershell
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs ls-tree -r --name-only c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70 machines/pcx86
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/xsl/machine.xsl
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs grep -n -i 'autoMount\|Choose File\|Mount' c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70 -- machines/pcx86/modules/v2/fdc.js
Get-FileHash ../fdd.img -Algorithm SHA256
```

## Result

Pass. A project-owned browser server can preserve pinned-source provenance,
relative resource loading, and local-media protection without writing to PCjs.
