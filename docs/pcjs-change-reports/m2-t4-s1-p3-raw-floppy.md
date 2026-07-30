# M2 T4 S1 P3 PCjs Change Report: Raw Floppy Media

PCjs machine configuration establishes the selected 1.44MB drive capacity.
Original TypeScript now models a geometry-validated raw CHS drive. It does not
copy PCjs media code, load protected media, parse DOS structures, attach an
FDC, perform DMA, raise IRQs, or alter firmware behavior.
