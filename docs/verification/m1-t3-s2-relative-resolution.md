# M1 T3 S2 Verification: Relative Resolution

## Result

Pass.

## Evidence

- The runner derives its project root from its own compiled module location.
- It resolves the PCjs checkout as `../pcjs` and media as `../fdd.img` from
  that project root; neither path is committed as a machine-specific absolute
  path.
- The local server returned HTTP 200 for the generated machine XML, pinned
  PCx86 runtime, and verified floppy endpoint.
- An isolated local Edge run loaded the same relative-path server endpoint and
  displayed `A:\>`.
