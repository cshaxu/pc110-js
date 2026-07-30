import type { LocalAssetDescriptor } from "../firmware/asset-manifest.js";

export const selectedDeskProRom: LocalAssetDescriptor = {
  id: "deskpro-rom",
  relativePath: "deskpro386-rom.bin",
  expectedBytes: 32_768,
  sha256: "fe25babe6bc7281f19a90c5bd8d958d35b2c2c98c6897da7773fb20b790e234a",
  required: true
};

export const selectedIbmVgaRom: LocalAssetDescriptor = {
  id: "ibm-vga-rom",
  relativePath: "ibm-vga-rom.bin",
  expectedBytes: 24_576,
  sha256: "14b8506381837caa7b1b99be671fa5fac650cc74cf1de28b2d13ad1101f51a3d",
  required: true
};

export const selectedDosFloppy: LocalAssetDescriptor = {
  id: "dos-floppy",
  relativePath: "fdd.img",
  expectedBytes: 1_474_560,
  sha256: "fadeb3a27c6a0e1cf582dde0b9aecb7e5d30678f2f967f2f4562f167cc0cb1d5",
  required: true
};
