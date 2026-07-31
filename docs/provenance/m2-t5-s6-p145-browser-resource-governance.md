# M2 T5 S6 P145 Browser Resource Governance

## Scope

This record adds an owner-approved resource rule for Codex in-app browser
verification. It does not change emulator, diagnostic, firmware, or device
behavior.

## Policy

Ordinary verification reuses one relevant browser tab. A second tab is allowed
only for an active, bounded native-versus-PCjs comparison. Unused tabs must be
closed before CPU-intensive browser execution and finalized after evidence is
recorded. When a tab cannot be closed through the control surface, subsequent
checks must reuse an already controlled tab instead of opening another.

## Rationale

The owner reported limited local resources and a risk of host instability from
unused browser windows. The policy retains the existing diagnostic capability
while bounding browser memory and CPU use.

## Impact

This is process governance only. Existing Fast Execution, selective-trace,
deterministic-replay, and controlled-lockstep requirements remain unchanged.
