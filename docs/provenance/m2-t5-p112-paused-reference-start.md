# M2 T5 P112 Provenance

- P111 showed that the PCjs physical-memory observations depend on execution
  that occurs before the browser automation can press Halt.
- PCjs supports the CPU configuration attribute `autoStart="false"` and the
  diagnostic wrapper already replaces the selected machine's CPU element.
- The wrapper now starts paused before any ROM instruction. The coordinator
  remains responsible for its normal whole-machine reset and explicit steps.
- A fresh paused reference reports `C8000=FF` and `E0000=FF`, correcting the
  earlier soft-reset-only memory inference.
