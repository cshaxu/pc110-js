# M2 T3 S4 P6 Verification

Focused scheduler tests cover independent PIT and RTC carried remainders and
invalid RTC clock rates. A rebuilt-machine test executes a three-cycle NOP
with a one-second RTC profile and proves that native RTC time advances one
second through normal CPU scheduling. The full quality gate is required before
commit.
