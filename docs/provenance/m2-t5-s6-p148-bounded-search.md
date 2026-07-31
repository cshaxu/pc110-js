# M2 T5 S6 P148 Bounded Search Provenance

## Source

P147 established a matching selected-ROM reset boundary and 1024-instruction
batch. The existing browser control could not search beyond that initial
window, even though its coordinator already supports a caller-selected total
limit and batch size.

## Project-Native Work

The diagnostic UI now requests a 65536-instruction reset-to-first-difference
search while retaining 1024-instruction PCjs batches. A mismatch still resets
both endpoints and single-steps only its final 1024-instruction batch.

## Non-Transfer

This changes no PCjs source, no emulator CPU or device behavior, and no
product runtime dependency.
