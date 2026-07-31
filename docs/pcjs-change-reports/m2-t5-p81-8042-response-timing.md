# M2 T5 P81 PCjs Change Report: 8042 Response Timing

## Basis

PCjs `chipset.js` distinguishes controller-command replies from keyboard data:
controller replies are held through one status-port poll, while keyboard data
is published immediately. The selected DeskPro ROM uses this boundary around
its controller test sequence.

## Project Change

The project-native 8042 keeps a pending controller-output state and publishes
OBF on the status poll following a controller reply. Snapshot observation does
not advance this state.

## Boundary

No PCjs code is imported, copied, or used at runtime. The change is a generic
8042 state-machine timing model, not a firmware workaround or guest service.
