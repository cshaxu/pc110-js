# M2 T2 NXVM CPU Authority Correction

## Decision

The owner authorized NXVM CPU coverage and validated instruction execution
behavior as the first-order M2 T2 CPU implementation baseline. Intel IA-32
documentation resolves CPU semantic conflicts. PCjs remains the PC/AT
compatibility, reference-machine, and whole-machine comparison authority.

## Required Scope

The M2 T2 CPU must cover every instruction and execution behavior represented
by NXVM `src/device/vcpu.h` and `src/device/vcpuins.c`, using project-native
TypeScript. In addition to strict 80386 behavior, the following NXVM
compatibility extensions are mandatory isolated CPU work:

- `CPUID`
- `RDMSR` and `WRMSR`
- `WBINVD`
- `RSM`

Each extension must use a generic CPU compatibility interface with no
dependency on BIOS, DOS, PC110, browser, or device shortcuts.

## Exclusions

Do not translate NXVM C source, macros, global state, BIOS, POST, device, I/O,
or guest-service behavior. NXVM code remains a reference, not a copied runtime.
No extension may relax the generic M2 hardware, ROM, fault, trace, or test
requirements.

## Completion Evidence

The coverage matrix must map every NXVM CPU instruction family and extension to
project-native tests, authority notes, and implementation status. M2 T2 cannot
close until that matrix, paging and fault behavior, the local ROM trace, and
the PCjs whole-machine comparison gates all pass.
