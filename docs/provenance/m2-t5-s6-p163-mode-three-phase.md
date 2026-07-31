# M2 T5 S6 P163 Mode-Three Phase Provenance

## Evidence

P162 localized the first cold whole-machine difference to `F000:B5B7` with
equal CPU state and virtual cycles but native PIT0 count `59670` versus PCjs
`59672`. The selected PCjs mode-3 timer refreshes its cycle origin at both
half-period underflows. The native device had reset its fractional CPU-cycle
remainder only when the output rose.

## Project-Native Work

The 8254 now exposes allocation-free output-transition flags. The PC/AT timing
adapter resets a mode-3 counter's fractional remainder at every output
transition, while preserving the existing rising-edge IRQ behavior and
mode-2 treatment. No ROM-address or firmware-state branch was introduced.

## Non-Transfer

No PCjs source changed or entered the product runtime. The repair is generic
8254 timing behavior and retains the project-native scheduler, device, and
profile boundaries.
