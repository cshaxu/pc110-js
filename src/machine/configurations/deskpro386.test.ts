import { describe, expect, it } from "vitest";
import { PcAtRtc } from "../../devices/pc-at-rtc.js";
import { RtcCmosRegister } from "../../devices/rtc-cmos.js";
import {
  deskPro386CmosConfiguration,
  deskPro386ReferenceRtcDate,
  deskPro386ReferenceRtcDateTime
} from "./deskpro386.js";

describe("DeskPro 386 CMOS configuration", () => {
  it("publishes one fixed RTC seed for native and PCjs differential execution", () => {
    expect(deskPro386ReferenceRtcDate).toBe("1990-01-01T00:00:00");
    expect(deskPro386ReferenceRtcDateTime).toEqual({
      year: 1990,
      month: 1,
      day: 1,
      weekday: 2,
      hour: 0,
      minute: 0,
      second: 0
    });
  });

  it("keeps the M1 4MB memory declaration explicit and outside the generic default", () => {
    const generic = new PcAtRtc();
    const deskpro = new PcAtRtc({ configuration: deskPro386CmosConfiguration });
    expect(generic.rtc.read(RtcCmosRegister.BaseMemoryLow)).toBe(0);
    expect(deskpro.rtc.read(RtcCmosRegister.BaseMemoryLow)).toBe(0x80);
    expect(deskpro.rtc.read(RtcCmosRegister.BaseMemoryHigh)).toBe(0x02);
    expect(deskpro.rtc.read(RtcCmosRegister.ExtendedMemoryLow)).toBe(0);
    expect(deskpro.rtc.read(RtcCmosRegister.ExtendedMemoryHigh)).toBe(0x0c);
    expect(deskpro.rtc.read(RtcCmosRegister.FloppyDriveType)).toBe(0x44);
    expect(deskpro.rtc.read(RtcCmosRegister.FixedDriveType)).toBe(0x50);
    deskpro.reset();
    expect(deskpro.rtc.read(RtcCmosRegister.ExtendedMemoryHigh)).toBe(0x0c);
  });
});
