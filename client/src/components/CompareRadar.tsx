import { useId } from 'react';

export interface RadarAxis {
  label: string;
  /** Score on this axis from 0 (worst) to 1 (best) for each ticker. */
  values: number[];
}

interface Props {
  axes: RadarAxis[];
  labels: string[];      // ticker names, one per series
  colors: string[];      // one color per series
  size?: number;
}

export default function CompareRadar({ axes, labels, colors, size = 320 }: Props) {
  const id = useId().replace(/[:]/g, '');
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.7;
  const n = axes.length;
  if (!n) return null;

  function pointFor(angleIdx: number, radius: number): [number, number] {
    const angle = (angleIdx / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  }

  // Concentric rings (4)
  const rings = [0.25, 0.5, 0.75, 1].map((t, idx) => {
    const path = axes
      .map((_, i) => {
        const [x, y] = pointFor(i, r * t);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ') + ' Z';
    return <path key={idx} d={path} fill="none" stroke="var(--hairline)" strokeWidth="1" />;
  });

  // Axis spokes
  const spokes = axes.map((_, i) => {
    const [x, y] = pointFor(i, r);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth="1" />;
  });

  // Series polygons
  const numSeries = labels.length;
  const seriesPaths = Array.from({ length: numSeries }).map((_, sIdx) => {
    const pts = axes.map((axis, i) => {
      const v = Math.max(0, Math.min(1, axis.values[sIdx] ?? 0));
      return pointFor(i, r * v);
    });
    const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z';
    return (
      <g key={sIdx}>
        <path d={path} fill={colors[sIdx]} fillOpacity={0.18} stroke={colors[sIdx]} strokeWidth="2" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={colors[sIdx]} />
        ))}
      </g>
    );
  });

  // Axis labels (outside the chart)
  const axisLabels = axes.map((axis, i) => {
    const [x, y] = pointFor(i, r + 18);
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const cosA = Math.cos(angle);
    if (cosA < -0.1) anchor = 'end';
    else if (cosA > 0.1) anchor = 'start';
    return (
      <text
        key={i}
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="middle"
        fontSize="11"
        fill="var(--ink-secondary)"
        className="font-medium"
      >
        {axis.label}
      </text>
    );
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} id={`radar-${id}`}>
        {rings}
        {spokes}
        {seriesPaths}
        {axisLabels}
      </svg>
      <div className="flex items-center gap-4 mt-2 flex-wrap justify-center">
        {labels.map((l, i) => (
          <div key={l} className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[i] }} />
            <span className="font-medium">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
