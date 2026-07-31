# M2 T5 P91 Provenance

- PCjs debugger single-stepping suppresses ordinary interrupts and is therefore
  unsuitable for a whole-machine behavioral oracle.
- The local PCjs `pc110` branch now exposes an opt-in chipset control that uses
  the regular positive instruction-budget path and normal timer-update order.
- The PC110JS diagnostic wrapper enables that control only on the existing
  development reference route. The standalone runtime remains native.
