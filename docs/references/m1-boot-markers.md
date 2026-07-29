# M1 Reference Boot Markers

These observable markers define the compact M1 reference boot sequence for
later M2 comparison. They are not a substitute for device-level tests.

1. `PCx86 v2.23` appears in the VGA display.
2. The DeskPro 386 system ROM and IBM VGA ROM load.
3. `Loading /_pc110js/media/fdd.img...` appears.
4. The local DOS floppy reports as mounted in drive A.
5. `Initialization complete` appears.
6. The display reaches the `A:\>` DOS prompt.

The runner's exact expected disk hash remains defined by
`docs/baselines/local-media-fdd-fadeb3a2.md`.
