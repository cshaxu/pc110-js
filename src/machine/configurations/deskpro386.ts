import type { RtcCmosConfiguration, RtcDateTime } from "../../devices/rtc-cmos.js";

/**
 * Fixed RTC seed for the DeskPro 386 differential profile. PCjs receives the
 * matching ISO value through its documented dateRTC machine parameter.
 */
export const deskPro386ReferenceRtcDate = "1990-01-01T00:00:00";

export const deskPro386ReferenceRtcDateTime: RtcDateTime = {
  year: 1990,
  month: 1,
  day: 1,
  weekday: 2,
  hour: 0,
  minute: 0,
  second: 0
};

/**
 * M1 DeskPro 386 4MB configuration bytes. This is a selectable variant input,
 * never an implicit default for the generic PC/AT profile.
 */
export const deskPro386CmosConfiguration: RtcCmosConfiguration = {
  baseMemoryKiB: 640,
  extendedMemoryKiB: 3072,
  floppyDriveTypes: 0x44
};
