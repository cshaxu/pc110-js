# M2 T2 S3 P393: Undefined 0F Intervals

The rebuilt dispatcher now routes NXVM-defined undefined `0F 40-7F` and
`0F C0-FF` encodings to vector six instead of throwing a host unsupported-opcode
error. No PCjs source or runtime code is involved. Other incomplete opcode
families remain explicit dispatcher gaps and are not reclassified as undefined.
