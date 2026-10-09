import { useReducedMotion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt, storeColor } from '../../lib/digest'
import VizTooltip from './VizTooltip'

// Stacked bars, one segment per store. 'columns' stands the bars up (age
// bands), 'rows' lays them down (statuses, long names). Bars are thin, the
// 2px gaps are the surface colour, the total sits at the tip.

const TICK = { fill: 'rgb(var(--ink-3))', fontSize: 12 }
const GRID = 'rgb(var(--line) / 0.08)'
const AXIS = 'rgb(var(--line) / 0.18)'

export default function StoreBars({ rows, stores, layout = 'columns', unit = 'vehicles', ariaLabel }) {
  const reduce = useReducedMotion()
  const horizontal = layout === 'rows'
  const height = horizontal ? Math.max(180, rows.length * 38 + 30) : 260

  const total = (props) => {
    const { x, y, width, height: h, index } = props
    const row = rows[index]
    if (!row || row.total === 0) return null
    return horizontal ? (
      <text x={x + width + 8} y={y + h / 2} dy=".35em" fontSize={12} fontWeight={600} fill="rgb(var(--ink-2))">
        {fmt(row.total)}
      </text>
    ) : (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill="rgb(var(--ink-2))">
        {fmt(row.total)}
      </text>
    )
  }

  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={rows}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={horizontal ? { top: 4, right: 44, left: 0, bottom: 4 } : { top: 24, right: 8, left: -8, bottom: 4 }}
        >
          <CartesianGrid stroke={GRID} horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={128}
                tick={{ ...TICK, fill: 'rgb(var(--ink-2))' }}
                tickLine={false}
                axisLine={{ stroke: AXIS }}
              />
            </>
          ) : (
            <>
              <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: AXIS }} />
              <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} width={40} />
            </>
          )}
          <Tooltip
            cursor={{ fill: 'rgb(var(--ink) / 0.05)' }}
            content={<VizTooltip stores={stores} unit={unit} />}
          />
          {stores.map((s, i) => {
            const last = i === stores.length - 1
            return (
              <Bar
                key={s.id}
                dataKey={`counts.${s.id}`}
                name={s.name}
                stackId="stack"
                fill={storeColor(stores, s.id)}
                stroke="var(--viz-surface)"
                strokeWidth={2}
                maxBarSize={24}
                radius={last ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
                isAnimationActive={!reduce}
                animationDuration={800}
              >
                {last && <LabelList dataKey={`counts.${s.id}`} content={total} />}
              </Bar>
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
