# M2 T5 P85 Provenance

- The launcher reads the two generic reference ROM byte arrays from the pinned
  PCjs commit `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70` with `git show`.
- It validates each exported ROM and the owner-provided sibling `fdd.img` by
  fixed size and SHA-256 before starting Vite.
- Generated ROM binaries reside only in ignored `.cache/developer-media`; no
  firmware, disk image, or host path becomes a committed product asset.
