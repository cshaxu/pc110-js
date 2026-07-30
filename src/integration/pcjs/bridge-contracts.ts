import type { RebuiltPortBus } from "../../cpu/rebuilt/io/port-bus.js";
import type { RebuiltMemoryBus } from "../../cpu/rebuilt/memory/segmented-memory.js";

export type PcjsProxyKind =
  | "chipset"
  | "video"
  | "floppy"
  | "fixed-storage"
  | "keyboard"
  | "serial"
  | "mouse";

export interface PcjsProxyDescriptor {
  readonly id: string;
  readonly kind: PcjsProxyKind;
  readonly sourcePath: string;
  readonly replacementOwner: string;
  readonly verificationWorkload: string;
}

export interface RebuiltDmaRequest {
  readonly channel: number;
  readonly direction: "read" | "write";
  readonly address: number;
  readonly length: number;
}

export interface PcjsBridgeContract {
  readonly memory: RebuiltMemoryBus;
  readonly ports: RebuiltPortBus;
  raiseInterrupt(vector: number): void;
  requestDma(request: RebuiltDmaRequest): void;
  reset(): void;
  advanceCycles(cycles: number): void;
}

export interface PcjsDeviceProxy {
  readonly descriptor: PcjsProxyDescriptor;
  attach(contract: PcjsBridgeContract): void;
  reset(): void;
  advanceCycles(cycles: number): void;
  dispose(): void;
}

export function validatePcjsProxyInventory(
  descriptors: readonly PcjsProxyDescriptor[]
): readonly PcjsProxyDescriptor[] {
  const ids = new Set<string>();
  for (const descriptor of descriptors) {
    if (!descriptor.id || !descriptor.sourcePath || !descriptor.replacementOwner) {
      throw new Error("PCjs proxy descriptors require id, source path, and replacement owner");
    }
    if (ids.has(descriptor.id)) throw new Error(`Duplicate PCjs proxy id: ${descriptor.id}`);
    ids.add(descriptor.id);
  }
  return descriptors;
}
