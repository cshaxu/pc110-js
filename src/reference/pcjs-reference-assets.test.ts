import { describe, expect, it } from "vitest";
import { PcjsReferenceAssets } from "./pcjs-reference-assets.js";

describe("PCjs diagnostic reference assets", () => {
  it("requires and configures the opt-in lockstep control surface", () => {
    const assets = new PcjsReferenceAssets(true);
    assets.verify();

    expect(assets.machineXml().toString("utf8")).toContain('pc110Lockstep="true"');
    expect(assets.machineXml().toString("utf8")).toMatch(
      /<chipset[^>]*dateRTC="1990-01-01T00:00:00"/
    );
    expect(assets.machineXml().toString("utf8")).toContain('autoStart="false"');
    expect(assets.pageHtml().toString("utf8")).toContain('id="pc110-lockstep-step"');
    expect(assets.pageHtml().toString("utf8")).toContain("stepInstruction");
    expect(assets.readResource("machines/pcx86/modules/v2/chipset.js").toString("utf8")).toContain(
      "stepPC110LockstepBatch"
    );
    expect(assets.pageHtml().toString("utf8")).toContain("snapshot");
    expect(assets.pageHtml().toString("utf8")).toContain("computerReady");
    expect(assets.readResource("machines/pcx86/modules/v2/chipset.js").toString("utf8")).toContain(
      "c8000: this.bus.getByteDirect"
    );
    expect(assets.readResource("machines/pcx86/modules/v2/chipset.js").toString("utf8")).toContain(
      "pitTiming: {"
    );
    expect(assets.readResource("machines/pcx86/modules/v2/chipset.js").toString("utf8")).toContain(
      "pc110ProbeCommandBytes"
    );
    expect(assets.pageHtml().toString("utf8")).toContain("commandBytes");
    expect(assets.pageHtml().toString("utf8")).toContain("pc110ProbeEvents ?? []");
  });
});
