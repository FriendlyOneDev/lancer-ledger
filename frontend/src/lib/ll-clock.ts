export function getLLClockSegments(ll: number): number {
  if (ll >= 1 && ll <= 5) return 3;
  if (ll >= 6 && ll <= 9) return 4;
  if (ll >= 10 && ll <= 12) return 5;
  return 3;
}

export function computeTotalLLTicks(licenseLevel: number, progress: number): number {
  let ticks = 0;
  for (let ll = 0; ll < licenseLevel; ll++) {
    ticks += getLLClockSegments(ll);
  }
  return ticks + progress;
}

export function ticksToLevelProgress(totalTicks: number): {
  level: number;
  progress: number;
} {
  let remaining = Math.max(0, totalTicks);
  for (let ll = 0; ll < 12; ll++) {
    const seg = getLLClockSegments(ll);
    if (remaining < seg) {
      return { level: ll, progress: remaining };
    }
    remaining -= seg;
  }
  return { level: 12, progress: 0 };
}

export interface LLClockInfo {
  level: number;
  segments: number;
  filled: number;
  pending: number;
}

export function computeLLClockDisplays(
  licenseLevel: number,
  progress: number,
  pendingTicks: number = 0,
): LLClockInfo[] {
  if (licenseLevel >= 12) {
    return [];
  }

  const displays: LLClockInfo[] = [];
  let remaining = pendingTicks;
  let ll = licenseLevel;
  let prog = progress;

  while (true) {
    if (ll >= 12) break;

    const segments = getLLClockSegments(ll);
    const filled = Math.min(prog, segments);
    const available = segments - filled;
    const pending = Math.min(remaining, available);

    displays.push({ level: ll, segments, filled, pending });

    remaining -= pending;
    if (remaining <= 0) break;

    ll++;
    prog = 0;
  }

  return displays;
}
