# M2 T5 P75 PCjs Change Report: Keyboard Gate Diagnosis

## Basis

PCjs's 8042 receive path admits keyboard data only when `NO_CLOCK` is clear.
The selected native controller applies the same physical clock gate.

## Project Change

No implementation behavior changes. This report corrects the browser
diagnostic record: `0x5D` retains the clock inhibit, so queued host scan codes
must not be used to bypass the selected ROM's error path.

## Boundary

No input injection, guest-state mutation, firmware behavior, timer behavior,
or PCjs runtime dependency was introduced.
