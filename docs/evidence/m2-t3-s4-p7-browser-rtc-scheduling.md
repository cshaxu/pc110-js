# M2 T3 S4 P7 Browser RTC Scheduling Evidence

After the P6 build, the browser received the selected validated system ROM,
IBM VGA ROM, and floppy through the existing local-media controls. A bounded
native run reached `C000:069C`; native RTC status C read `0x40`, the periodic
event flag, while the run control remained responsive and could pause.

This confirms that CPU-scheduled RTC advancement reaches the project-native
browser machine. It is not evidence of successful POST, storage boot, or DOS.
