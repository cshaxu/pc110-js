import { describe, expect, it } from "vitest";
import { PcAtSystemPort } from "./pc-at-system-port.js";

describe("project-native PC/AT system port", () => {
  it("exposes timer-2 and speaker gates independently", () => {
    const port = new PcAtSystemPort();
    port.write(0x01);
    expect(port.speakerOutput(true)).toBe(false);
    port.write(0x03);
    expect(port.speakerOutput(false)).toBe(false);
    expect(port.speakerOutput(true)).toBe(true);
  });

  it("reports refresh separately from writable parity and I/O-check controls", () => {
    const port = new PcAtSystemPort();
    port.write(0x30);
    expect(port.snapshot()).toMatchObject({ memoryParityEnabled: false, ioCheckEnabled: false });
    port.setRefreshActive(true);
    expect(port.read() & 0x10).toBe(0);
    port.setRefreshActive(false);
    expect(port.read() & 0x10).toBe(0x10);
  });

  it("resets to a deterministic generic signal state", () => {
    const port = new PcAtSystemPort();
    port.write(0xff);
    port.setRefreshActive(false);
    port.reset();
    expect(port.snapshot()).toEqual({
      control: 0,
      refreshActive: true,
      timer2Gate: false,
      speakerData: false,
      memoryParityEnabled: true,
      ioCheckEnabled: true
    });
  });

  it("restores writable controls and refresh state", () => {
    const port = new PcAtSystemPort();
    port.write(0x33);
    port.setRefreshActive(false);
    const checkpoint = port.snapshot();

    port.reset();
    port.restore(checkpoint);

    expect(port.snapshot()).toEqual(checkpoint);
  });
});
