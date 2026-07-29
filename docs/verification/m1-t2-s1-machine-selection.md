# M1 T2 S1 Machine Selection Verification

## Scope

This record verifies the selected existing PCjs 80386 reference configuration.

## Evidence

- The selected DeskPro 386 4MB VGA XML declares `model="80386"`.
- It declares `[1440,1440]` floppy geometry, matching the known-good 1.44MB
  local floppy.
- Its XML contains CPU, RAM, ROM, VGA, FDC, HDC, keyboard, chipset, serial, and
  mouse components.
- The 2MB DeskPro and Progressive Pro 386 candidates declare only 1.2MB floppy
  geometry.
- The IBM 5170 comparison configuration declares `model="80286"`.

## Verification Commands

```powershell
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/compaq/deskpro386/vga/2048kb/machine.xml
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/progressive/pro386/ega/2048kb/machine.xml
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/ibm/5170/vga/4096kb/machine.xml
```

## Result

Pass. The DeskPro 386 4MB VGA configuration is the selected M1 reference
machine. Its machine-specific behavior is explicit and remains distinct from
the M2 generic PC/AT variant boundary.
