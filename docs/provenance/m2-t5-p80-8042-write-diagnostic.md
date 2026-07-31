# M2 T5 P80 Provenance

- Existing mixed 8042 port tails are dominated by guest reads of status port
  `0x64`, which can hide the finite controller command sequence.
- The selected-ROM blocker requires identifying actual writes to ports `0x60`
  and `0x64`, not recording every executed instruction.
- P80 therefore retains only the latest sixteen writes to those ports in the
  browser checkpoint diagnostic.
