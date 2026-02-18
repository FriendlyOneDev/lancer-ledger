"use client";

import ClockWidget from "./ClockWidget";
import { computeLLClockDisplays } from "@/lib/ll-clock";

interface LLClockDisplayProps {
  licenseLevel: number;
  progress: number;
  pendingTicks?: number;
  size?: number;
}

export default function LLClockDisplay({
  licenseLevel,
  progress,
  pendingTicks = 0,
  size = 120,
}: LLClockDisplayProps) {
  if (licenseLevel >= 12) {
    return (
      <div className="flex flex-col items-center">
        <span className="text-sm text-gray-400 mb-2">License Level</span>
        <span className="text-lg font-bold text-yellow-400">
          MAX LEVEL (LL 12)
        </span>
      </div>
    );
  }

  const displays = computeLLClockDisplays(licenseLevel, progress, pendingTicks);

  return (
    <div className="flex flex-wrap justify-center gap-4">
      {displays.map((display) => (
        <ClockWidget
          key={display.level}
          filled={display.filled}
          pending={display.pending}
          total={display.segments}
          label={`LL ${display.level} → ${display.level + 1}`}
          size={size}
          fillColor="#eab308"
          pendingColor="#facc15"
        />
      ))}
    </div>
  );
}
