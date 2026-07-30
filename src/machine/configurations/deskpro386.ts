import type { RtcCmosConfiguration } from "../../devices/rtc-cmos.js";

/**
 * M1 DeskPro 386 4MB configuration bytes. This is a selectable variant input,
 * never an implicit default for the generic PC/AT profile.
 */
export const deskPro386CmosConfiguration: RtcCmosConfiguration = {
  baseMemoryKiB: 640,
  extendedMemoryKiB: 3072
};
