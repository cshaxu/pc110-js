# M2 T5 P23 PCjs Change Report: Browser Keyboard

No PCjs implementation is changed or imported. The browser maps selected DOM
`KeyboardEvent.code` values to standard Set-1 make/break bytes and delivers
them through the project-native 8042 input boundary.
