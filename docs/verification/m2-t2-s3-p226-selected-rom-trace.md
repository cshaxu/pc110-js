# M2 T2 S3 P226: Selected ROM Trace

## Purpose

Classify the next execution boundary with the selected, read-only DeskPro 386 ROM without
copying firmware content into this repository or treating port responses as device emulation.

## Method

The locally supplied selected ROM was parsed only in memory and mapped through `PhysicalMemory`
into a `PcAt386Core`, including its required reset alias. A read-only port boundary returned zero
for every byte read and ignored writes. The trace was limited to 1000 instructions.

## Result

The project-owned core completed all 1000 steps without an unmapped-memory failure or an
unsupported-opcode error. Under the deliberately inert port boundary, execution entered a stable
firmware polling loop.

This result proves only the current CPU and ROM-memory path can execute the selected local ROM
through that bounded point. It does not prove PIC, PIT, keyboard controller, VGA, storage, or DOS
boot behavior. Those remain required M2 hardware and whole-machine work.
