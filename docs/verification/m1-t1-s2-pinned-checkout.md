# M1 T1 S2 Pinned PCjs Checkout Verification

## Scope

This record verifies the read-only sibling PCjs checkout and pinned-object
availability. It does not select or run the M1 machine.

## Evidence

- The sibling repository root resolves to `D:/home/repos.hobby/pcjs`.
- Its worktree is clean and remains on the owner-managed `pc110` branch at
  `6688c7fe5312a434cc0db629ac9c92e197ad9e77`.
- `origin/master` resolves to
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- The pinned commit object is present and is identical to `origin/master`.
- The pinned object contains the PCx86 v2 module tree.

## Reference-Run Boundary

The owner-managed sibling worktree HEAD is not the pinned baseline. A later M1
runner must use the pinned Git object through a read-only operation and must not
checkout, reset, configure, or otherwise modify the sibling repository.

## Verification Commands

```powershell
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs diff --quiet c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70 origin/master
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs status --porcelain
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs cat-file -e c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70^{commit}
```

## Result

Pass. The pinned PCjs source is available for read-only M1 reference work
without changing the owner's active sibling checkout.
