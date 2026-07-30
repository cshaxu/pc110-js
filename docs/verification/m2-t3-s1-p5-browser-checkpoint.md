# M2 T3 S1 P5 Verification: Browser PIC Checkpoint

Focused tests verify the browser checkpoint creates the rebuilt core and
reports `F000:FFF0` with zeroed master/slave IRR and ISR values after reset.
Manual local Vite-browser verification displayed that same reset state, retained
it after Reset, and reported no browser console errors or warnings. No firmware,
BIOS, storage, display, or DOS result is claimed.
