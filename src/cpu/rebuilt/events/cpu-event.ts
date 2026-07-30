export type CpuEventKind = "fault" | "software-interrupt" | "external-interrupt";

export interface CpuEvent {
  readonly kind: CpuEventKind;
  readonly vector: number;
  readonly faultEip?: number;
  readonly errorCode?: number;
}
