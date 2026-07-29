# M1 To M2 Peripheral Map

| PCjs v2 source module | M2 destination area | Boundary |
| --- | --- | --- |
| `fdc.js`, `disk.js` | `src/devices/floppy/` | controller, drive, raw image, IRQ, DMA, and write-protect paths without DOS knowledge |
| `hdc.js` | `src/devices/storage/at-ide/` | selected fixed-storage controller and Type 5 geometry behavior |
| `video.js` | `src/devices/video/vga/` | VGA registers and framebuffer behavior |
| `keyboard.js` | `src/devices/input/keyboard/` | scan-code source and controller-facing behavior |
| `serial.js`, `mouse.js` | `src/devices/serial/` | UART and serial-pointer behavior |
| `weblib.js`, `embed.js`, XSL resources | `src/platform/browser/`, `src/app/` | file selection, rendering, and UI outside hardware cores |

M2 uses a browser presentation adapter for canvas and input. It must not place
DOM assumptions in device implementations or teach storage code about DOS.
