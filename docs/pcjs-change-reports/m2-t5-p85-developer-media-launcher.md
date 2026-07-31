# M2 T5 P85 PCjs Change Report: Developer Media Source

## Basis

Browser development needs a repeatable way to provide the existing opt-in
local-media endpoints without copying ROM data into pc110-js.

## Change

No PCjs source, generated bundle, branch, or runtime behavior changed. The
pc110-js launcher reads two files from the already pinned PCjs commit, verifies
their bytes, and exports temporary binaries only for the local Vite process.

## Boundary

The launcher is a developer command. The standalone product neither imports
PCjs nor discovers host media paths at runtime; normal browser media ownership
and validation remain unchanged.
