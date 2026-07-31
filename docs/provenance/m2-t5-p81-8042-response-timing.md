# M2 T5 P81 Provenance

- Selected-ROM observation reaches the controller self-test and interface-test
  command sequence before the later BIOS keyboard-buffer wait.
- PCjs `chipset.js` documents controller replies as a distinct output-buffer
  timing class: a response is published after one status-port poll so firmware
  flush logic cannot consume it prematurely. Keyboard-delivered bytes remain
  immediately visible.
- The project-native controller now represents that generic controller timing
  boundary explicitly. It adds no host timer, BIOS service, input injection,
  or platform-specific response.
