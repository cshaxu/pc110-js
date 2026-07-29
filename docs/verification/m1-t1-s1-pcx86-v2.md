# M1 T1 S1 PCx86 V2 Verification

## Scope

This record confirms PCjs PCx86 v2 as the M1 reference generation. It does not
select the M1 machine configuration.

## Evidence

- The read-only sibling checkout contains pinned commit
  `c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70`.
- `machines/pcx86/modules/v2/` contains the PCx86 CPU, bus, memory, chipset,
  ROM, RAM, storage, video, keyboard, interrupt, and computer modules.
- `machines/pcx86/modules/v2/x86.js` defines CPU models through
  `MODEL_80386` and defines no `MODEL_80486`.
- `machines/pcx86/modules/v2/cpux86.js` provides 80386-specific cycle,
  opcode, reset, register, and protected-mode state paths.

## Verification Commands

```powershell
git -c safe.directory=D:/home/repos.hobby/pcjs -C ../pcjs rev-parse c7f21b4fa2bdedac3d5c73094a6402fdc8b24c70^{commit}
rg -n -C 2 'MODEL_80286|MODEL_80386' ../pcjs/machines/pcx86/modules/v2/x86.js
rg -n -C 2 'case X86.MODEL_80386|this.model >= X86.MODEL_80386' ../pcjs/machines/pcx86/modules/v2/cpux86.js
```

## Result

Pass. PCx86 v2 is the M1 reference generation. Its generic CPU ceiling is the
80386; any later PC110 486SX/SL work remains an explicit M3 variant or delta.
