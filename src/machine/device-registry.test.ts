import { describe, expect, it } from "vitest";
import { DeviceRegistry } from "./device-registry.js";

describe("DeviceRegistry", () => {
  it("selects a named device variant without changing the contract", () => {
    const registry = new DeviceRegistry();
    registry.register({
      kind: "video",
      variant: "vga",
      create: () => ({ id: "vga0", kind: "video", reset: () => undefined })
    });

    expect(registry.create("video", "vga").id).toBe("vga0");
    expect(() => registry.create("video", "pc110-lcd")).toThrow("Unknown device variant");
    expect(() =>
      registry.register({
        kind: "video",
        variant: "vga",
        create: () => ({ id: "duplicate", kind: "video", reset: () => undefined })
      })
    ).toThrow("Device variant already registered");
  });
});
