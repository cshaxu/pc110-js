# M1 Runtime Dependency Inventory

## Pinned PCjs Resources

| Pinned path | Role | M1 handling |
| --- | --- | --- |
| `machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml` | Reference machine XML | Serve from pinned object only |
| `machines/pcx86/compaq/deskpro386/rom/1988-01-28/1988-01-28.json5` | System ROM data | Local pinned object only; never commit |
| `machines/pcx86/ibm/video/vga/1986-10-27/ibm-vga-autolockfs.xml` | VGA configuration | Serve from pinned object only |
| `machines/pcx86/ibm/video/vga/1986-10-27/IBM-VGA.json5` | VGA ROM data | Local pinned object only; never commit |
| `machines/pcx86/ibm/fdc/library.xml` | FDC controls and catalog settings | Serve after M1 local-media isolation |
| `machines/pcx86/ibm/hdc/47mb/unformatted-at5.xml` | AT HDC configuration | Serve from pinned object only |
| `machines/pcx86/ibm/keyboard/us84-softkeys.xml` | Keyboard configuration | Serve from pinned object only |
| `machines/pcx86/releases/2.25/pcx86.js` | Compiled PCx86 v2 browser runtime | Serve from pinned object only |
| `machines/pcx86/xsl/*` | Machine transformation and presentation | Serve from pinned object only |
| `assets/js/xslt-polyfill.min.js` | Browser XSL compatibility | Serve from pinned object only |
| `machines/machines.json` | PCx86 v2 module and browser resource manifest | Read for dependency verification |

The ROM and browser resources remain local references from the user's sibling
checkout. They are not copied, committed, or redistributed by pc110-js.

## Local Protected Media

| Logical identifier | Relative local path | Size | SHA-256 | Role |
| --- | --- | ---: | --- | --- |
| `dos-floppy` | `../fdd.img` | 1,474,560 | `FADEB3A27C6A0E1CF582DDE0B9AECB7E5D30678F2F967F2F4562F167CC0CB1D5` | Read-only M1 boot media |

## Excluded Dependencies

- The selected machine's default COMPAQ MS-DOS 3.31D auto-mount names.
- PCjs public and private diskette catalog content.
- Any PCjs archive disk needed only for demonstrations.
- Debugger and visualizer resources not required by the normal browser run.

## Browser And Build Boundary

M1 uses the PCjs 2.25 compiled browser runtime from the pinned source object.
The project-owned runner is responsible for local serving, source identity,
resource-path validation, and local-media validation. M1 does not adopt PCjs
build tooling or copy the release bundle into this repository.
