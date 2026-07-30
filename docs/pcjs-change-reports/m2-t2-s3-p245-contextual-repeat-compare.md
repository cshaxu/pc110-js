# M2 T2 S3 P245: Contextual Repeat Comparison

## Summary

P245 routes REPE and REPNE CMPS or SCAS through the shared execution context.

## Basis

PCjs is the behavioral authority for repeat-string count width, data width,
address width, and zero-flag termination. Under the 80386 model, address size
selects CX or ECX, operand size selects word or dword comparison data, and F3
or F2 selects continue-on-zero or continue-on-nonzero behavior.

## Change

The context repeats comparison strings with independently selected count and
index widths. Each iteration updates comparison flags, source and destination
indexes, then applies the selected zero-flag termination rule.

## Verification

Tests cover default-32 REPE CMPSD, 66-selected REPNE CMPSW, and 67-selected
16-bit count and indexes with dword data. They assert final flags, count, and
index registers.

## Boundaries

Repeat MOVS/STOS, segment overrides, devices, firmware, and PC110 behavior
remain outside P245. No PCjs JavaScript or NXVM C source was copied.
