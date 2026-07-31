# M2 T5 P77 Verification

- Focused profile coverage verifies writable low, extended, and relocatable
  RAM apertures while the VGA hole remains unmapped/floating.
- A browser milestone run with the profile reached the selected ROM's
  `F000:C242` BDA keyboard-ring wait. The BDA pointers remained equal; the RAM
  apertures are present but do not alone resolve this separate input boundary.
- The full gate passed: formatting, build, lint, the full test suite, and
  `git diff --check`.
