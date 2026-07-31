# Architecture Authority And M2 Convergence

## Product Direction

PC110JS is a project-native TypeScript virtual-machine platform. It must be
readable, modular, and capable of composing multiple machine experiences from
profiles. A future project rename does not change this architecture.

The product is not a JavaScript port of PCjs, a TypeScript translation of NXVM,
or a browser wrapper around PC110-EMU.

## Reference Responsibilities

### NXVM: Structure And CPU Scope

NXVM is the structural reference for the native CPU implementation during M2.
Adopt its useful ideas: explicit CPU state, instruction-family organization,
segment and descriptor data models, separation of decode from execution, and
trace/debugging boundaries. Its M2 CPU coverage ledger defines the required
instruction scope where the owner has made it authoritative.

Do not transfer NXVM C code, macros, global state, POST, BIOS, interrupt
services, guest services, device behavior, timing shortcuts, or platform
hacks. NXVM is not an M3-or-later PC110 behavior authority without explicit
owner reauthorization.

### PCjs: Observable PC/AT Behavior And Profile Composition

PCjs PCx86 v2 is the primary behavior and compatibility authority for the
selected standard PC/AT machine. It supplies evidence for CPU-adjacent PC/AT
behavior, device contracts, virtual-time behavior, machine composition, and
the selected DeskPro 386 reference profile.

The historical M1 DeskPro browser prompt uses the upstream XML's
`ramLow test="false"` configuration. PCjs writes the BDA warm-boot marker for
that option, so M1 proves reference integration and local-media viability but
not the no-shortcut cold-POST timing or path required by M2. Cold M2
comparison must use the generated diagnostic configuration with `test="true"`.
The standalone M2 DOS gate remains mandatory and must not use a warm-boot
marker or another firmware shortcut.

The project may reproduce PCjs observable behavior through project-native
TypeScript, configuration, and device interfaces. It must not import PCjs at
product runtime, translate its JavaScript line by line, inherit web lifecycle
or scheduler assumptions, or copy its historical implementation structure.
PCjs is a test oracle and reference machine, not a fallback implementation.

### PC110-EMU: PC110-Specific Evidence

PC110-EMU, dumped PC110 ROMs, and exported PC110 hardware logic are inputs for
a future PC110 profile. Real hardware observations, dumped-firmware execution,
and reliable component documentation remain the primary PC110 authorities.

PC110-EMU may explain a device, register, wiring relationship, or ROM-visible
behavior, but its hardcoded platform assumptions, PCDOS/BIOS behavior,
guest-service shortcuts, placeholders, and run-through hacks must not enter
the generic core or a profile implementation without stronger evidence.

## Native Architecture Boundary

The product architecture is:

`Machine Profile -> Device Registry -> Device Interface -> Device Variant`

A profile owns ROM selection, local-asset identifiers, memory map, I/O
ownership, device variants, wiring, and timing configuration. The generic core
owns CPU, memory, buses, device interfaces, scheduler, lifecycle, tracing, and
browser-independent execution. The browser UI is an adapter and never a device
implementation.

DeskPro 386 and future PC110 profiles must remain independently instantiable.
Machine-specific behavior belongs in a selected profile or a selected device
variant, never in generic CPU, memory, firmware, DOS, or guest-service code.

## M2 Completion Boundary

M2 establishes one complete, standalone, project-owned 80386 PC/AT reference
machine: the selected DeskPro 386 profile with fixed reference configuration,
verified local media, and a browser DOS workload that reaches the expected DOS
prompt. It does not require reproducing every PCjs machine, website feature,
or unselected device branch.

M2 completion requires:

- the documented NXVM-authorized 80386 CPU coverage and tests;
- project-owned TypeScript CPU, memory, device, profile, UI, and runtime paths;
- no PCjs, NXVM, or PC110-EMU product-runtime dependency;
- selected-profile behavior validated against PCjs at focused and whole-machine
  checkpoints; and
- the native browser workload reaching DOS without firmware, DOS, filesystem,
  timing, interrupt, or input shortcuts.

M3 and M4 add PC110 device variants, ROMs, wiring, and profile configuration
while preserving the M2 DeskPro regression profile.

## Convergence Method

Long independent browser runs are milestone evidence, not the primary way to
locate a whole-machine difference. For a selected-profile mismatch:

1. Start native and PCjs diagnostics from an equivalent, paused, deterministic
   reset boundary with identical media, profile configuration, and RTC seed.
2. Advance both sides by bounded instruction batches and compare normalized CPU,
   virtual-time, selected-device, memory-write, and I/O-transaction summaries.
3. On the first mismatched batch, shrink the batch and then use instruction
   lockstep to identify the first differing instruction or device transaction.
4. Use a short deterministic Full Debug Replay only for that interval.
5. Correct project-native behavior using the applicable authority. Record every
   intentional remaining difference in the compatibility-exceptions register.

The differential mechanism is diagnostic-only. It must not copy state from
PCjs into the native machine, select a native handler from PCjs, or conceal a
missing device behind an accepted difference.

## Prohibited Shortcuts

No source authority permits fake BIOS, DOS, PCDOS, filesystem, boot-repair,
guest-service, host-time, synthetic IRQ, synthetic input, forced timer, or
delay-loop workaround to reach a boot checkpoint. A profile configuration is
not a shortcut when it expresses real selected-machine hardware ownership,
wiring, timing, or ROM mapping and is supported by evidence.
