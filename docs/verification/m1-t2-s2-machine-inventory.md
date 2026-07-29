# M1 T2 S2 Machine Inventory Verification

## Scope

This record verifies the selected reference machine's configured hardware and
source-module inventory.

## Evidence

- The source machine XML identifies every direct selected component.
- Each XML `ref` or `file` resource was resolved in the pinned PCjs Git object.
- The PCx86 README provides the v2 shared and PCx86 module order used to form
  the core and selected-device closure.
- FDC library inspection identified its disk catalog, mount controls, and
  archive-media default that must be isolated from the M1 local-media path.

## Verification Commands

```powershell
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/compaq/deskpro386/vga/4096kb/machine.xml
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/ibm/fdc/library.xml
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs show c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70:machines/pcx86/README.md
```

## Result

Pass. The selected machine, direct resources, runtime modules, browser modules,
and machine-specific boundaries are recorded. No PCjs source or media was copied.
