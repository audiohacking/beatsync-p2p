import type { PositionType } from "@beatsync/shared/types/basic";

function calculateEuclideanDistance(p1: PositionType, p2: PositionType): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

interface GainParams {
  client: PositionType;
  source: PositionType;
  falloff?: number;
  minGain?: number;
  maxGain?: number;
}

export function calculateGainFromDistanceToSource(params: GainParams): number {
  const { client, source, falloff = 0.001, minGain = 0.15, maxGain = 1.0 } = params;
  const distance = calculateEuclideanDistance(client, source);
  const gain = maxGain - falloff * distance * distance;
  return Math.max(minGain, gain);
}
