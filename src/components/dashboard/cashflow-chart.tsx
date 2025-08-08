'use client'

import { Box, Typography, Skeleton } from '@mui/material'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { formatCurrency, formatShortDate } from '@/lib/utils/format'

interface CashflowData {
  date: string
  income: number
  expenses: number
  balance: number
}

interface CashflowChartProps {
  data?: CashflowData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box
        sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          p: 2,
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          {formatShortDate(label)}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              color: entry.color,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: entry.color,
              }}
            />
            {entry.name}: {formatCurrency(entry.value)}
          </Typography>
        ))}
      </Box>
    )
  }
  return null
}

export function CashflowChart({ data }: CashflowChartProps) {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" color="rgba(255, 255, 255, 0.7)">
          Нет данных для отображения
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
            tickFormatter={(value) => formatShortDate(value)}
          />
          
          <YAxis
            tick={{ fill: 'rgba(255, 255, 255, 0.8)' }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="income"
            stackId="1"
            stroke="#10b981"
            fill="url(#incomeGradient)"
            name="Доходы"
          />
          
          <Area
            type="monotone"
            dataKey="expenses"
            stackId="1"
            stroke="#ef4444"
            fill="url(#expensesGradient)"
            name="Расходы"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}
