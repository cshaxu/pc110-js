# M2 T3 S3 P5 Verification: Browser DMA Checkpoint

Focused tests verify the checkpoint includes reset DMA0 and DMA1 mask values.
Manual local Vite-browser verification displayed `0F` for both controllers,
retained it after Reset, and reported no browser console errors or warnings. No
requesting device, FDC, storage, firmware, or DOS result is claimed.
