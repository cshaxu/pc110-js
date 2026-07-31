# M2 T5 S6 P162 Lockstep Search Extension Provenance

## Trigger

The M1 browser evidence records the selected PCjs DeskPro machine reaching
`A:\\>` with the validated floppy, while P161 and the following bounded native
browser run reach the ROM keyboard-buffer wait at `F000:C242`. P160 established
that the native and PCjs endpoints still match through 66,560 cold boundaries.

## Project-Native Work

The diagnostic UI increases only its total caller-selected search limit from
65,536 to 131,072 instructions. The existing project-native coordinator keeps
its 1,024-instruction batches and its reset-plus-final-batch replay method.

## Non-Transfer

No PCjs source or normal runtime behavior changes. The page does not import
state from PCjs, proxy an unimplemented device, or accept a compatibility
exception.
