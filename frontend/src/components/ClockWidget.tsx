"use client";

interface ClockWidgetProps {
  filled: number;
  pending?: number;
  total: number;
  label: string;
  size?: number;
  fillColor?: string;
  pendingColor?: string;
}

export default function ClockWidget({
  filled,
  pending = 0,
  total,
  label,
  size = 80,
  fillColor = "#3b82f6",
  pendingColor = "#22d3ee",
}: ClockWidgetProps) {
  const radius = size / 2 - 2;
  const center = size / 2;

  const segments = Array.from({ length: total }).map((_, i) => {
    const startAngle = (i * 360) / total - 90;
    const endAngle = ((i + 1) * 360) / total - 90;

    const isFilled = i < filled;
    const isPending = !isFilled && i < filled + pending;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = 360 / total > 180 ? 1 : 0;

    const pathD = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    let fill = "#374151";
    let filter: string | undefined;

    if (isFilled) {
      fill = fillColor;
    } else if (isPending) {
      fill = pendingColor;
      filter = "url(#glow)";
    }

    return (
      <path
        key={i}
        d={pathD}
        fill={fill}
        stroke="#1f2937"
        strokeWidth="2"
        filter={filter}
      />
    );
  });

  return (
    <div className="flex flex-col items-center">
      {label && <span className="text-sm text-gray-400 mb-2">{label}</span>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="#374151"
          stroke="#1f2937"
          strokeWidth="2"
        />
        {segments}
      </svg>
      <span className="text-xs text-gray-500 mt-1">
        {filled}{pending > 0 ? `+${pending}` : ""}/{total}
      </span>
    </div>
  );
}
