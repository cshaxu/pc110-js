# M2 T5 P47 Provenance

- Authority: P45 requires a bounded record of the actual keyboard-controller
  port exchange without per-instruction trace retention.
- Contract: `PC110JS_ROM_TRACE_PORT_TAIL` retains only the requested number of
  project-native port trace events. It is separate from generic event tails,
  which may contain interrupt events.
- Boundary: this is diagnostic instrumentation only; it changes no port,
  interrupt, timer, keyboard, firmware, or browser behavior.
