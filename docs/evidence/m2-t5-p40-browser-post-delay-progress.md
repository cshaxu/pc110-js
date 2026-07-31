# M2 T5 P40 Browser Post-Delay Progress

From the P39 paused state at `F000:C672`, the same mounted browser-native
machine ran for a bounded thirty-second observation window. It reached
`F000:C246`; an already scheduled native slice completed during Pause and the
stable paused state was `F000:DCA7`.

The primary PIC request was `0x01`; RTC status C was `0x50`; FDC DMA masks
remained `0x0F`; and the text canvas remained blank. This is evidence that
native firmware execution crosses the earlier PIT-delay path, not a boot or
DOS claim.
