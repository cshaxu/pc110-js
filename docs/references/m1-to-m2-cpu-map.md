# M1 To M2 CPU Map

This is a study and provenance map, not a file-copy plan. M2 destinations are
project-native TypeScript modules and may be refined only with a provenance
update.

| PCjs v2 source module | M2 destination area | Required behavior |
| --- | --- | --- |
| `x86.js`, `defines.js` | `src/cpu/x86/` | CPU model constants, architectural state, and flags |
| `cpu.js`, `cpux86.js` | `src/cpu/x86/cpu.ts` | lifecycle, execution loop, exceptions, and timing boundary |
| `segx86.js` | `src/cpu/x86/segmentation.ts` | real, protected, and virtual-8086 segmentation |
| `x86help.js`, `x86func.js` | `src/cpu/x86/helpers.ts` | arithmetic, flag, stack, and effective-address helpers |
| `x86mods.js` | `src/cpu/x86/modrm.ts` | ModR/M decoding and operand access |
| `x86ops.js`, `x86op0f.js` | `src/cpu/x86/opcodes/` | complete selected 80386 opcode families |
| `fpux86.js` | `src/cpu/x86/fpu.ts` | selected PCjs FPU behavior when the profile enables it |

M2 must preserve the M1 80386 ceiling. PC110 486SX/SL behavior is an M3 variant
task, not an implicit extension of these modules.
