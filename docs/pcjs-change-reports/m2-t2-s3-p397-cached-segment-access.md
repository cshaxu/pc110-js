# M2 T2 S3 P397: Cached Segment Access

The rebuilt CPU now retains and enforces protected cached segment access
attributes, including expand-down limits. No PCjs source or runtime code is
used. Instruction fetch remains distinct from data reads; v86, task, and gate
access behavior remains separate work.
