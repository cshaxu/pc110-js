import { describe, expect, it } from "vitest";
import { PcAtRtc } from "../../devices/pc-at-rtc.js";
import { RtcCmosRegister } from "../../devices/rtc-cmos.js";
import { deskPro386CmosConfiguration } from "./deskpro386.js";

describe("DeskPro 386 CMOS configuration", () => {
  it("keeps the M1 4MB memory declaration explicit and outside the generic default", () => {
    const generic = new PcAtRtc();
    const deskpro = new PcAtRtc({ configuration: deskPro386CmosConfiguration });
    expect(generic.rtc.read(RtcCmosRegister.BaseMemoryLow)).toBe(0);
    expect(deskpro.rtc.read(RtcCmosRegister.BaseMemoryLow)).toBe(0x80);
    expect(deskpro.rtc.read(RtcCmosRegister.BaseMemoryHigh)).toBe(0x02);
    expect(deskpro.rtc.read(RtcCmosRegister.ExtendedMemoryLow)).toBe(0);
    expect(deskpro.rtc.read(RtcCmosRegister.ExtendedMemoryHigh)).toBe(0x0c);
    deskpro.reset();
    expect(deskpro.rtc.read(RtcCmosRegister.ExtendedMemoryHigh)).toBe(0x0c);
  });
});
