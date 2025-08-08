'use client'

import { Card, CardContent, CardHeader, Typography, Box, Skeleton } from '@mui/material'
import { TrendingUp, TrendingDown, Remove, AccountBalance, TrendingDown as ArrowDown, TrendingUp as ArrowUp, Flag } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils/format'

interface KPICardProps {
  title: string
  value: number
  change: number
  type: 'balance' | 'income' | 'expenses' | 'savings'
  loading?: boolean
}

const cardVariants = {
  hover: {
    y: -2,
    transition: {
      duration: 0.2,
    },
  },
}

const getTypeConfig = (type: KPICardProps['type']) => {
  switch (type) {
    case 'balance':
      return {
        icon: <AccountBalance sx={{ fontSize: 16 }} />,
        color: 'text.muted'
      }
    case 'income':
      return {
        icon: <ArrowDown sx={{ fontSize: 16 }} />,
        color: 'text.muted'
      }
    case 'expenses':
      return {
        icon: <ArrowUp sx={{ fontSize: 16 }} />,
        color: 'text.muted'
      }
    case 'savings':
      return {
        icon: <Flag sx={{ fontSize: 16 }} />,
        color: 'text.muted'
      }
    default:
      return {
        icon: <AccountBalance sx={{ fontSize: 16 }} />,
        color: 'text.muted'
      }
  }
}

export function KPICard({ title, value, change, type, loading = false }: KPICardProps) {
  const config = getTypeConfig(type)
  
  const getChangeIcon = () => {
    if (change > 0) return <TrendingUp sx={{ color: '#10b981', fontSize: 12, mr: 0.5 }} />
    if (change < 0) return <TrendingDown sx={{ color: '#ef4444', fontSize: 12, mr: 0.5 }} />
    return <Remove sx={{ color: 'text.muted', fontSize: 12, mr: 0.5 }} />
  }

  const getChangeColor = () => {
    if (change > 0) return '#10b981'
    if (change < 0) return '#ef4444'
    return 'text.muted'
  }

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardHeader sx={{ pb: 1 }}>
          <Skeleton variant="text" width="40%" height={20} />
        </CardHeader>
        <CardContent>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="50%" height={16} sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      style={{ height: '100%' }}
    >
      <Card sx={{ height: '100%' }}>
        <CardHeader sx={{ 
          display: 'flex', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          pb: 1
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Box sx={{ color: config.color }}>
            {config.icon}
          </Box>
        </CardHeader>
        <CardContent>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {formatCurrency(value)} ₴
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: getChangeColor() }}>
            {getChangeIcon()}
            <Typography variant="caption">
              {change > 0 ? '+' : ''}{formatCurrency(change)} от прошлого месяца
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  )
}
