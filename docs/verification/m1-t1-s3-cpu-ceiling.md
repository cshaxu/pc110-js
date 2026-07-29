# M1 T1 S3 Generic CPU Ceiling Verification

## Scope

This record confirms the generic CPU boundary for M1 and M2. It does not
implement any CPU feature.

## Evidence

- PCjs v2 `x86.js` defines `MODEL_80386`.
- PCjs v2 `x86.js` defines no `MODEL_80486`.
- PCjs v2 `cpux86.js` includes a dedicated `MODEL_80386` cycle default and
  multiple 80386-gated state and instruction paths.
- The project baseline, architecture direction, README, and contribution rules
  consistently define the generic baseline as 80386 and reserve PC110 486SX/SL
  behavior for M3 variants or deltas.

## Verification Commands

```powershell
rg -n 'MODEL_80386' ../pcjs/machines/pcx86/modules/v2/x86.js
rg -n 'MODEL_80486' ../pcjs/machines/pcx86/modules/v2/x86.js
rg -n -C 1 'case X86.MODEL_80386' ../pcjs/machines/pcx86/modules/v2/cpux86.js
```

## Result

Pass. The highest supported generic CPU model is 80386. M2 must not claim
complete 80486 behavior, and M3 must introduce PC110 CPU differences explicitly.
