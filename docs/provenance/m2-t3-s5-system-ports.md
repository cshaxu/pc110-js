# M2 T3 S5 System-Port Provenance

## Reference Boundary

- Behavioral reference: pinned read-only PCjs
  `machines/pcx86/modules/v2/chipset.js` PPI/8042 system-port, CMOS NMI-mask,
  reset, and A20 definitions.
- Product code: original TypeScript only; no PCjs device, runtime, firmware,
  media, browser resource, host audio, or guest-service behavior is imported.

## Initial Scope

The local system-port device will own `0x61` state and its PIT2 relation. RTC
continues to own the `0x70` NMI-mask bit, while S5 composes it into a CPU-facing
NMI admission boundary. The narrow A20/reset output contract is explicitly
reserved for the selected 8042 implementation in S6.

## P1 Plan Boundary

P1 records that no required PCjs selected-machine evidence supports a synthetic
port `0x92` path. It also keeps DeskPro-specific NMI/error and chipset wiring
out of the generic PC/AT baseline pending an explicit selectable variant.

## P2 System-Port State Core

P2 implements the shared low-bit PPI/8042 RWREG state as a local TypeScript
model. Refresh is an explicit observable signal, rather than a host-clock
effect. Keyboard-controller, DeskPro-only, NMI, reset, A20, PCjs, firmware,
media, and browser audio dependencies remain excluded.
