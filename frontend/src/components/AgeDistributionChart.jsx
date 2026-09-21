import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Colors from the design system's dataviz reference palette: blue is the
// documented default single hue for a sequential/magnitude series; the rest
// are its chart-chrome tokens (gridline, axis, muted/secondary text,
// surface). One hue for the whole series -- color follows the entity
// (vehicles), never a per-bucket rank.
const SERIES_COLOR = '#2a78d6'
const GRIDLINE = '#e1e0d9'
const AXIS = '#c3c2b7'
const MUTED_TEXT = '#898781'
const SECONDARY_TEXT = '#52514e'
const SURFACE = '#fcfcfb'

const BUCKETS = [
  { key: '60-89', label: '60-89 days', test: (d) => d >= 60 && d < 90 },
  { key: '90-119', label: '90-119 days', test: (d) => d >= 90 && d < 120 },
  { key: '120-179', label: '120-179 days', test: (d) => d >= 120 && d < 180 },
  { key: '180+', label: '180+ days', test: (d) => d >= 180 },
]

export function bucketAges(ages) {
  return BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: ages.filter(bucket.test).length,
  }))
}

function LollipopMark(props) {
  const { x, y, width, height, value } = props
  const cx = x + width / 2
  const stemBottom = y + height
  return (
    <g>
      <line x1={cx} y1={stemBottom} x2={cx} y2={y} stroke={SERIES_COLOR} strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={y} r={8} fill={SURFACE} />
      <circle cx={cx} cy={y} r={6} fill={SERIES_COLOR} />
      <text x={cx} y={y - 14} textAnchor="middle" fontSize={12} fontWeight={600} fill={SECONDARY_TEXT}>
        {value}
      </text>
    </g>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <div className="font-semibold text-slate-800">
        {point.count} vehicle{point.count === 1 ? '' : 's'}
      </div>
      <div className="text-xs text-slate-500">{point.label}</div>
    </div>
  )
}

export default function AgeDistributionChart({ ages }) {
  const data = bucketAges(ages)
  const hasData = data.some((d) => d.count > 0)

  if (!hasData) {
    return <p className="text-sm text-slate-400">No aged inventory to chart yet.</p>
  }

  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke={GRIDLINE} strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            tick={{ fill: MUTED_TEXT, fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: MUTED_TEXT, fontSize: 12 }}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Bar dataKey="count" shape={LollipopMark} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
