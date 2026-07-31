# M2 T5 P117 Provenance: Lockstep Cycle Boundary

At the first stable PIT difference, both CPUs were at `F000:BB15`. PCjs
reported total CPU cycles `857`, PIT channel one start cycles `852`, and count
`18`. The project-native core reported virtual cycles `1188` and count `17`.

The equal instruction location and equal PIT divisor establish that the
remaining difference is CPU cycle accounting, not PIT frequency selection.
