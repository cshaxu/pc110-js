export type SegmentName = "cs" | "ds" | "es" | "ss" | "fs" | "gs";

export interface SegmentCache {
  readonly selector: number;
  readonly base: number;
  readonly limit: number;
  readonly default32: boolean;
}

export const REAL_MODE_SEGMENT: SegmentCache = {
  selector: 0,
  base: 0,
  limit: 0xffff,
  default32: false
};

export const RESET_CODE_SEGMENT: SegmentCache = {
  selector: 0xf000,
  base: 0xffff0000,
  limit: 0xffff,
  default32: false
};

export function cloneSegment(segment: SegmentCache): SegmentCache {
  return { ...segment };
}
