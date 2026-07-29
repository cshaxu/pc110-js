# M1 T3 S4 Verification: Read-Only Sibling Boundary

## Result

Pass.

## Command

`git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs status --porcelain`
was captured before and after serving the generated machine XML and local
floppy through the runner.

## Observed Fact

Both captures were empty. The runner reads tracked pinned-object content using
`git show` and does not write to the sibling checkout.
