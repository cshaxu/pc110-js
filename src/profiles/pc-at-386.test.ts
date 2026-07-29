import { describe, expect, it } from "vitest";
import { pcAt386Profile } from "./pc-at-386.js";

describe("pc-at-386 profile", () => {
  it("is the generic complete M2 device selection", () => {
    expect(pcAt386Profile.id).toBe("pc-at-386");
    expect(new Set(pcAt386Profile.devices.map((selection) => selection.kind)).size).toBe(
      pcAt386Profile.devices.length
    );
    expect(pcAt386Profile.devices.map((selection) => selection.kind)).toEqual([
      "cpu",
      "memory",
      "chipset",
      "storage",
      "video",
      "input",
      "serial"
    ]);
  });
});
