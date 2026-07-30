# M2 T3 S7 P4 PCjs Change Report: PC/AT FPU Control

PCjs owns `0xF0` and `0xF1` in the 5170 chipset as clear-busy and reset
signals for an attached FPU, expecting zero output. Original TypeScript now
models the same port-owned signals with strict byte/zero validation. It does
not import PCjs, add an x87, modify firmware, or synthesize guest services.
