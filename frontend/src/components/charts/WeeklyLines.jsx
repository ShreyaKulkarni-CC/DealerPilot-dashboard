import { useReducedMotion } from 'framer-motion'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { storeColor } from '../../lib/digest'
import VizTooltip from './VizTooltip'

// One line per store across weeks. A vertical hairline follows the pointer
// and the tooltip lists every store at that week.

const TICK = { fill: 'rgb(var(--ink-3))', fontSize: 12 }

export default function WeeklyLines({ rows, stores, unit = 'appraisals', ariaLabel }) {
  const reduce = useReducedMotion()
  return (
    <div role="img" aria-label={ariaLabel} style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="rgb(var(--line) / 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--line) / 0.18)' }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={TICK} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            cursor={{ stroke: 'rgb(var(--line) / 0.25)', strokeWidth: 1 }}
            content={<VizTooltip stores={stores} unit={unit} />}
          />
          {stores.map((s) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={`counts.${s.id}`}
              name={s.name}
              stroke={storeColor(stores, s.id)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 5, stroke: 'var(--viz-surface)', strokeWidth: 2 }}
              isAnimationActive={!reduce}
              animationDuration={900}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
