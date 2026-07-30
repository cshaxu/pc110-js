import { describe, expect, it } from "vitest";
import { validatePcjsProxyInventory, type PcjsProxyDescriptor } from "./bridge-contracts.js";

const chipset: PcjsProxyDescriptor = {
  id: "chipset",
  kind: "chipset",
  sourcePath: "machines/pcx86/modules/v2/chipset.js",
  replacementOwner: "M2 T3 chipset variants",
  verificationWorkload: "M1 browser DOS boot markers"
};

describe("PCjs bridge contracts", () => {
  it("retains a CPU-free, uniquely identified proxy inventory", () => {
    expect(validatePcjsProxyInventory([chipset])).toEqual([chipset]);
  });

  it("rejects incomplete and duplicate proxy records", () => {
    expect(() => validatePcjsProxyInventory([{ ...chipset, replacementOwner: "" }])).toThrow(
      "replacement owner"
    );
    expect(() => validatePcjsProxyInventory([chipset, chipset])).toThrow("Duplicate PCjs proxy id");
  });
});
