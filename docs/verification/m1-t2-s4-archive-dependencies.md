# M1 T2 S4 Archive Dependency Verification

## Scope

This record verifies that archive-media defaults do not disqualify the selected
DeskPro 386 reference machine.

## Evidence

- The machine XML default auto-mount contains named COMPAQ archive disks.
- The FDC library contains catalog paths and a browser-local file mount control.
- The selected hardware resources and browser resources all resolve from the
  pinned PCjs source object.
- The M1 local boot path uses the hash-validated `../fdd.img` instead of the
  default archive media.

## Result

Pass. Archive media is excluded from M1 startup configuration and is not a
required dependency of the selected hardware path.
