# M2 T5 P21 Browser Memory Holes Evidence

Manual localhost browser verification used the validated temporary binary form
of the pinned DeskPro ROM and the local `fdd.img`, selected through the page's
file inputs. Before this part, native Run paused at physical `0xE0000`; after
the matching physical and I/O bus profiles were applied, it remained running
from `F000:B5B5` through `F000:B5EC` over a three-second observation.

The browser runtime used the project-native core and devices. This proves media
mounting and early whole-machine execution, not DOS boot, FDC command
completion, or full VGA display acceptance.
