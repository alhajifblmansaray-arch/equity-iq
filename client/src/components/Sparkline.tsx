interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export default function Sparkline({ values, width = 64, height = 22, color, fill = true }: Props) {
  if (!values.length) return <span className="inline-block" style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / span) * height;
    return [x, y] as [number, number];
  });
  const line = points.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const up = values[values.length - 1] >= values[0];
  const stroke = color || (up ? 'var(--forest)' : 'var(--brick)');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {fill && (
        <path
          d={area}
          fill={stroke}
          fillOpacity={0.12}
          strokeWidth="0"
        />
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
