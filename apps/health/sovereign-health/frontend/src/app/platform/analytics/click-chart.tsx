'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface ClickChartProps {
  data: Array<{ date: string; clicks: number }>
}

export function ClickChart({ data }: ClickChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717a', fontSize: 11 }}
          tickFormatter={(v: string) => {
            const d = new Date(v)
            return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`
          }}
          interval="preserveStartEnd"
          angle={data.length > 14 ? -45 : 0}
          textAnchor={data.length > 14 ? 'end' : 'middle'}
          height={data.length > 14 ? 50 : 30}
        />
        <YAxis
          tick={{ fill: '#71717a', fontSize: 11 }}
          allowDecimals={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            color: '#fafafa',
          }}
          labelFormatter={(label) => {
            const d = new Date(String(label))
            return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })
          }}
          formatter={(value) => [String(value), 'Clicks']}
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#clickGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#f97316', stroke: '#09090b', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
