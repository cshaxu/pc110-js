# M2 T5 S6 P168 Option-ROM Lockstep Search Provenance

## Trigger

P167 established cold native/PCjs equality through 393,216 boundaries. P158
already records the native machine's one-million-instruction option-ROM
checkpoint, making it the next justified whole-machine comparison target.

## Project-Native Work

Only the development-only caller limit changes from 262,144 to 1,000,000
instructions. The coordinator, 1,024-instruction batch size, compared fields,
reset path, and final-batch single-step replay are unchanged.

## Non-Transfer

No PCjs source or product runtime behavior changes. This part adds no device
proxy, state transfer, compatibility exception, or firmware workaround.
