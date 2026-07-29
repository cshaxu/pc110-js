# M1 Reference Machine Contract

## Selected Configuration

- PCjs source generation: PCx86 v2.
- Pinned source commit: `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- Source machine XML:
  `machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml`.
- Machine name: COMPAQ DeskPro 386, 4MB RAM, IBM VGA.
- CPU: `model="80386"`.
- Bus width: 32 bits.
- Floppy geometry: `[1440,1440]`.

## Selection Rationale

The selected XML is the smallest existing PCjs 80386 browser machine found
that declares two 1.44MB floppy drives. It has explicit CPU, RAM, ROM, VGA,
FDC, HDC, keyboard, chipset, serial, and mouse configuration and can accept the
known-good 1.44MB local floppy through PCjs FDC behavior.

## Rejected Candidates

- COMPAQ DeskPro 386 VGA 2MB: explicit 80386, but its FDC geometry is
  `[1200,1200]` and cannot satisfy the known-good 1.44MB floppy requirement.
- Progressive Pro 386 EGA 2MB: explicit 80386 and 5170 chipset, but its FDC
  geometry is `[1200,1200]`.
- IBM 5170 VGA 4MB: provides a standard PC AT chipset and 1.44MB support, but
  the existing XML declares an 80286 CPU rather than the M1 80386 requirement.

## M2 Contract Boundary

The selected machine is PC/AT-compatible but includes a `deskpro386` chipset,
COMPAQ ROM mapping, and 32-bit bus configuration. M2 must model every selected
machine device through explicit project-native contracts while keeping standard
PC/AT implementations separately selectable. It must not silently identify
DeskPro-specific behavior as generic PC/AT behavior.

## Source Dependencies

- COMPAQ DeskPro 386 ROM JSON resource.
- IBM VGA XML and ROM resources.
- IBM FDC library and local floppy attachment.
- IBM 47MB HDC configuration.
- IBM 84-key keyboard configuration.
- PCx86 v2 modules and root-relative XSL, CSS, JavaScript, and shared resources.

No PCjs source or media is copied into this repository by this contract.
