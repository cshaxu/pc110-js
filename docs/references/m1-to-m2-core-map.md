# M1 To M2 Core Map

| PCjs v2 source module | M2 destination area | Boundary |
| --- | --- | --- |
| `memory.js` | `src/memory/` | physical mapping, RAM, ROM, and access rules |
| `bus.js` | `src/bus/` | memory and I/O dispatch contracts |
| `computer.js` | `src/machine/` | machine lifecycle and component wiring |
| `interrupts.js` | `src/cpu/x86/interrupts.ts` | CPU exception and interrupt delivery boundary |
| `component.js`, `state.js` | `src/core/` | lifecycle, state serialization, and diagnostics contracts |
| `weblib.js`, `embed.js` | `src/platform/browser/` | browser-only host integration, outside device cores |

M2 must replace PCjs component inheritance with narrow TypeScript interfaces,
profiles, and a registry. Host scheduling belongs in `src/platform/`; emulated
time belongs in the machine core and is deterministic under tests.
