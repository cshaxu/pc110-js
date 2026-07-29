# M1 Reference Machine Inventory

## Direct Machine Components

Source: `machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml` at the M1
pinned PCjs commit.

| Component | Selected configuration | Classification |
| --- | --- | --- |
| Computer | `deskpro386-vga-4096k`, 32-bit bus | DeskPro-specific wiring |
| CPU | `cpu386`, model `80386` | Generic CPU reference |
| RAM | Low RAM, DeskPro RAM window, 3MB extended RAM | Mixed |
| System ROM | COMPAQ DeskPro 386 ROM JSON | DeskPro-specific |
| Video | IBM VGA with IBM VGA ROM | Standard PC-compatible |
| FDC | IBM FDC library, two 1.44MB drives | Standard PC/AT-compatible |
| HDC | IBM AT Type 5 47MB configuration | Standard PC/AT-compatible |
| Keyboard | IBM 84-key soft keyboard | Standard PC/AT-compatible |
| Chipset | `deskpro386` | DeskPro-specific |
| Serial | COM1 and COM2 | Standard PC-compatible |
| Mouse | Serial COM1 mouse | Standard PC-compatible |

## Direct Resource Closure

- COMPAQ DeskPro 386 ROM JSON:
  `machines/pcx86/compaq/deskpro386/rom/1988-01-28/1988-01-28.json5`.
- IBM VGA configuration and ROM JSON:
  `machines/pcx86/ibm/video/vga/1986-10-27/ibm-vga-autolockfs.xml` and
  `machines/pcx86/ibm/video/vga/1986-10-27/IBM-VGA.json5`.
- IBM FDC library:
  `machines/pcx86/ibm/fdc/library.xml`.
- IBM AT Type 5 HDC configuration:
  `machines/pcx86/ibm/hdc/47mb/unformatted-at5.xml`.
- IBM 84-key keyboard configuration:
  `machines/pcx86/ibm/keyboard/us84-softkeys.xml`.
- Root-relative PCx86 XSL, CSS, shared JavaScript, and PCx86 release resources.

## Runtime Module Closure

Required PCx86 v2 core modules are `defines`, `x86`, `interrupts`, `message`,
`bus`, `memory`, `cpu`, `cpux86`, `fpux86`, `segx86`, `x86func`, `x86help`,
`x86mods`, `x86ops`, `x86op0f`, and `computer`.

Required selected-device modules are `chipset`, `rom`, `ram`, `keyboard`,
`video`, `serial`, `mouse`, `disk`, `fdc`, and `hdc`.

Required PCjs shared browser modules are `defines`, `diskapi`, `dumpapi`,
`reportapi`, `userapi`, `strlib`, `usrlib`, `weblib`, `component`, `state`,
`embed`, and `save`.

`debugger` and `parallel` are not required for the normal selected reference
machine. Debugger XML remains an investigation aid only.

## Media Boundary

The FDC library includes PCjs diskette catalog paths and the selected XML names
archival COMPAQ DOS auto-mount media. The M1 runner must replace the reference
machine auto-mount state with the validated local floppy and must not depend on
PCjs archive or private-disk content for the M1 boot proof.

## M2 Variant Boundary

The `deskpro386` computer, chipset, ROM mapping, and RAM window remain explicit
machine-specific variants. M2 must separately retain selectable standard PC/AT
device implementations.
