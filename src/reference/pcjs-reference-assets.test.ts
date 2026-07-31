import { describe, expect, it } from "vitest";
import { PcjsReferenceAssets } from "./pcjs-reference-assets.js";

describe("PCjs diagnostic reference assets", () => {
  it("requires and configures the opt-in lockstep control surface", () => {
    const assets = new PcjsReferenceAssets(true);
    assets.verify();

    expect(assets.machineXml().toString("utf8")).toContain('pc110Lockstep="true"');
    expect(assets.pageHtml().toString("utf8")).toContain('id="pc110-lockstep-step"');
    expect(assets.pageHtml().toString("utf8")).toContain("stepInstruction");
  });
});
