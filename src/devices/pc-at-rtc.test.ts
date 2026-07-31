import { describe, expect, it } from "vitest";
import { RebuiltMachinePortBus } from "../machine/rebuilt-port-bus.js";
import { RTC_TICKS_PER_SECOND, RtcCmosRegister } from "./rtc-cmos.js";
import { PcAtRtc, RTC_CMOS_ADDRESS_PORT, RTC_CMOS_DATA_PORT } from "./pc-at-rtc.js";

describe("project-native PC/AT RTC/CMOS", () => {
  it("maps the selected address/data ports and retains the S5 NMI signal boundary", () => {
    const rtc = new PcAtRtc();
    const bus = new RebuiltMachinePortBus();
    for (const range of rtc.portRanges()) bus.register(range);
    bus.write(RTC_CMOS_ADDRESS_PORT, 0x80 | RtcCmosRegister.StatusD, 8);
    expect(rtc.nmiDisabled()).toBe(true);
    expect(bus.read(RTC_CMOS_ADDRESS_PORT, 8)).toBe(0x8d);
    expect(bus.read(RTC_CMOS_DATA_PORT, 8)).toBe(0x80);
    expect(() => bus.read(RTC_CMOS_DATA_PORT, 16)).toThrow("8-bit");
  });

  it("raises IRQ8 only from explicit emulated RTC advancement", () => {
    const irqs: number[] = [];
    const rtc = new PcAtRtc({}, (irq) => irqs.push(irq));
    rtc.write(RTC_CMOS_ADDRESS_PORT, RtcCmosRegister.StatusB, 8);
    rtc.write(RTC_CMOS_DATA_PORT, 0x42, 8);
    rtc.write(RTC_CMOS_ADDRESS_PORT, RtcCmosRegister.StatusA, 8);
    rtc.write(RTC_CMOS_DATA_PORT, 0x26, 8);
    rtc.advance(RTC_TICKS_PER_SECOND);
    expect(irqs).toEqual([8]);
    rtc.write(RTC_CMOS_ADDRESS_PORT, RtcCmosRegister.StatusC, 8);
    expect(rtc.read(RTC_CMOS_DATA_PORT, 8) & 0xc0).toBe(0xc0);
    expect(rtc.snapshot().statusC).toBe(0);
  });

  it("restores the CMOS address and NMI-mask signal with RTC state", () => {
    const rtc = new PcAtRtc();
    rtc.write(RTC_CMOS_ADDRESS_PORT, 0x80 | RtcCmosRegister.Equipment, 8);
    const checkpoint = rtc.capture();

    rtc.write(RTC_CMOS_ADDRESS_PORT, RtcCmosRegister.StatusA, 8);
    rtc.write(RTC_CMOS_DATA_PORT, 0x20, 8);
    rtc.restore(checkpoint);

    expect(rtc.capture()).toEqual(checkpoint);
    expect(rtc.nmiDisabled()).toBe(true);
    expect(rtc.read(RTC_CMOS_ADDRESS_PORT, 8)).toBe(0x94);
  });
});
