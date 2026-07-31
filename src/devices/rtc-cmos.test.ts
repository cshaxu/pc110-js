import { describe, expect, it } from "vitest";
import { RTC_TICKS_PER_SECOND, RtcCmos, RtcCmosRegister } from "./rtc-cmos.js";

describe("project-native MC146818 RTC/CMOS state", () => {
  it("starts from a deterministic BCD 24-hour clock and clears status C on read", () => {
    const rtc = new RtcCmos({
      initialDateTime: { year: 1990, month: 1, day: 2, weekday: 2, hour: 13, minute: 4, second: 5 }
    });
    expect(rtc.read(RtcCmosRegister.Hours)).toBe(0x13);
    expect(rtc.read(RtcCmosRegister.Minutes)).toBe(0x04);
    expect(rtc.read(RtcCmosRegister.Seconds)).toBe(0x05);
    expect(rtc.read(RtcCmosRegister.StatusC)).toBe(0);
  });

  it("converts BCD and 12-hour writes into canonical time", () => {
    const rtc = new RtcCmos();
    rtc.write(RtcCmosRegister.StatusB, 0);
    rtc.write(RtcCmosRegister.Hours, 0x81);
    rtc.write(RtcCmosRegister.Minutes, 0x59);
    expect(rtc.snapshot().dateTime).toMatchObject({ hour: 13, minute: 59 });
    expect(rtc.read(RtcCmosRegister.Hours)).toBe(0x81);

    rtc.write(RtcCmosRegister.StatusB, STATUS_B_BINARY_24_HOUR);
    expect(rtc.read(RtcCmosRegister.Hours)).toBe(13);
    expect(rtc.read(RtcCmosRegister.Minutes)).toBe(59);
  });

  it("advances deterministically across a leap-day boundary and honors SET", () => {
    const rtc = new RtcCmos({
      initialDateTime: {
        year: 2000,
        month: 2,
        day: 28,
        weekday: 1,
        hour: 23,
        minute: 59,
        second: 59
      }
    });
    expect(rtc.advance(RTC_TICKS_PER_SECOND)).toMatchObject({ updated: true });
    expect(rtc.snapshot().dateTime).toMatchObject({
      month: 2,
      day: 29,
      weekday: 2,
      hour: 0,
      minute: 0,
      second: 0
    });
    rtc.write(RtcCmosRegister.StatusB, 0x82);
    rtc.advance(RTC_TICKS_PER_SECOND);
    expect(rtc.snapshot().dateTime.second).toBe(0);
  });

  it("sets enabled periodic, update, and alarm flags and acknowledges them through status C", () => {
    const rtc = new RtcCmos({
      initialDateTime: { year: 1990, month: 1, day: 1, weekday: 1, hour: 0, minute: 0, second: 59 }
    });
    rtc.write(RtcCmosRegister.StatusA, 0x26);
    rtc.write(RtcCmosRegister.StatusB, 0x72);
    rtc.write(RtcCmosRegister.SecondsAlarm, 0x00);
    rtc.write(RtcCmosRegister.MinutesAlarm, 0x01);
    rtc.write(RtcCmosRegister.HoursAlarm, 0x00);
    expect(rtc.advance(RTC_TICKS_PER_SECOND)).toMatchObject({
      periodic: true,
      updated: true,
      alarm: true,
      interruptRequested: true
    });
    expect(rtc.read(RtcCmosRegister.StatusC)).toBe(0xf0);
    expect(rtc.snapshot().statusC).toBe(0);
  });

  it("retains ordinary CMOS bytes and produces the selected checksum range", () => {
    const rtc = new RtcCmos();
    rtc.write(RtcCmosRegister.Equipment, 0x41);
    rtc.write(RtcCmosRegister.BaseMemoryLow, 0x80);
    rtc.write(RtcCmosRegister.BaseMemoryHigh, 0x02);
    rtc.updateChecksum();
    expect(rtc.read(RtcCmosRegister.Equipment)).toBe(0x41);
    expect(rtc.read(RtcCmosRegister.ChecksumLow)).toBe(0xc3);
    expect(rtc.read(RtcCmosRegister.ChecksumHigh)).toBe(0);
  });

  it("applies bounded configuration bytes and recalculates the checksum", () => {
    const rtc = new RtcCmos();
    rtc.applyConfiguration({ baseMemoryKiB: 640, extendedMemoryKiB: 3072, equipment: 0x41 });
    expect(rtc.read(RtcCmosRegister.BaseMemoryLow)).toBe(0x80);
    expect(rtc.read(RtcCmosRegister.BaseMemoryHigh)).toBe(0x02);
    expect(rtc.read(RtcCmosRegister.ExtendedMemoryLow)).toBe(0);
    expect(rtc.read(RtcCmosRegister.ExtendedMemoryHigh)).toBe(0x0c);
    expect(rtc.read(RtcCmosRegister.Equipment)).toBe(0x41);
    expect(() => rtc.applyConfiguration({ baseMemoryKiB: 0x1_0000 })).toThrow("outside");
  });

  it("restores CMOS bytes, status, and the deterministic tick phase", () => {
    const rtc = new RtcCmos();
    rtc.write(RtcCmosRegister.Equipment, 0x41);
    rtc.advance(123);
    const checkpoint = rtc.capture();

    rtc.write(RtcCmosRegister.Equipment, 0);
    rtc.advance(RTC_TICKS_PER_SECOND);
    rtc.restore(checkpoint);

    expect(rtc.capture()).toEqual(checkpoint);
    expect(rtc.advance(RTC_TICKS_PER_SECOND - 123)).toMatchObject({ updated: true });
    expect(rtc.snapshot().dateTime.second).toBe(1);
  });
});

const STATUS_B_BINARY_24_HOUR = 0x06;
