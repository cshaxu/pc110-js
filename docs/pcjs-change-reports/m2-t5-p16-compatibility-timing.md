# M2 T5 P16 PCjs Change Report: Compatibility Timing

PCjs updates PIT state from elapsed CPU cycles and documents that most of its
80386 timing remains 80286-derived. The native core retains its independent
cycle scheduler, adds only generic stack/control timing classes, and adds no
PCjs runtime dependency, ROM workaround, or device-specific timing shortcut.
