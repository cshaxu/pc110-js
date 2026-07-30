import type { DmaGrant } from "./dma8237.js";

export interface DmaMemoryAccess {
  read8(address: number): number;
  write8(address: number, value: number): void;
}

export interface DmaEndpoint {
  read8(): number;
  write8(value: number): void;
}

export function performDmaTransfer(
  grant: DmaGrant,
  memory: DmaMemoryAccess,
  endpoint: DmaEndpoint
): void {
  if (grant.transferType === "verify") return;
  for (let offset = 0; offset < grant.unitBytes; offset += 1) {
    const address = grant.address + offset;
    if (grant.transferType === "write") memory.write8(address, endpoint.read8());
    else endpoint.write8(memory.read8(address));
  }
}
