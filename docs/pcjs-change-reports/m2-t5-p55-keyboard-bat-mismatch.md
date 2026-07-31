# M2 T5 P55 PCjs Change Report: Keyboard BAT Mismatch

PCjs is unchanged and remains the read-only compatibility authority. Its
documented `0x4D`/BAT behavior justified P54, but the native selected-ROM Fast
run shows that this behavior alone does not satisfy the later `F000:DCA7` BDA
queue wait. No PCjs source was copied or modified.
