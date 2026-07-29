# Machine Profiles And Device Variants

M2 selects hardware through this chain:

```text
MachineProfile -> DeviceSelection -> DeviceRegistry -> DeviceFactory -> MachineDevice
```

Each profile names a complete machine and selects a variant for every required
device kind. A registry holds project-native factories keyed by device kind and
variant. Devices expose only their narrow lifecycle and domain contracts.

The generic `pc-at-386` profile is the default M2 family. DeskPro details from
M1 and PC110 behavior in M3/M4 are additional profile selections and variants;
they must not replace generic implementations in place.

Browser, Node, and test hosts instantiate machine profiles through the same
core. Browser rendering and local-file APIs remain platform adapters, not
device variants.
