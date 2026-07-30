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

## P3 System-Port And PIT2 Composition

P3 composes local `0x61` state with the existing native PIT only. The port
adapter has no PCjs dependency and exports a hardware signal rather than sound.
The reset action owns only local control/gate state; it does not provide NMI,
8042, A20, firmware, media, or machine-wide reset behavior.

## P4 NMI Admission And Delivery

P4 uses the existing project-native interrupt-frame delivery implementation but
adds a distinct non-maskable admission entry that does not consult IF or STI
inhibition. The RTC address-port mask remains the only modeled admission gate.
Hardware error sources, DeskPro signals, 8042 protocol, A20, reset, PCjs, and
firmware dependencies remain excluded.
