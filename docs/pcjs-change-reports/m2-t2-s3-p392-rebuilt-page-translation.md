# M2 T2 S3 P392: Rebuilt Page Translation

The rebuilt CPU now applies project-native 80386 page translation to instruction
and segmented data accesses when protected paging is active. No PCjs source or
runtime import is used. The change preserves generic PC/AT page-table behavior;
fault-vector delivery, TLB policy, and full segment permissions remain separate
CPU architecture work.
