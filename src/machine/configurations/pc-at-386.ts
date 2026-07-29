import type { MachineProfile } from "../contracts.js";

export const pcAt386Profile: MachineProfile = {
  id: "pc-at-386",
  displayName: "Generic PC/AT 386",
  devices: [
    { kind: "cpu", variant: "x86-386" },
    { kind: "memory", variant: "pc-at" },
    { kind: "chipset", variant: "pc-at" },
    { kind: "storage", variant: "at-fdc" },
    { kind: "video", variant: "vga" },
    { kind: "input", variant: "at-keyboard" },
    { kind: "serial", variant: "uart-16550" }
  ]
};
