# M2 T5 P14 PCjs Change Report: Native Browser Media

PCjs reference media loading is not used by the product runtime. Original
TypeScript validates user-selected assets, maps ROM aliases into native memory,
attaches raw floppy media to the native FDC, and schedules the native core.
No PCjs runtime or media-loading code is imported.
