'use client'

import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Grid,
  Chip,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material'
import { motion } from 'framer-motion'

interface HealthMetric {
  name: string
  value: number
  maxValue: number
  status: 'excellent' | 'good' | 'warning' | 'critical'
  description: string
  icon: React.ReactNode
}

const healthMetrics: HealthMetric[] = [
  {
    name: 'Долговая нагрузка',
    value: 15,
    maxValue: 50,
    status: 'excellent',
    description: 'Отличное соотношение долгов к доходам',
    icon: <CheckCircle color="success" />,
  },
  {
    name: 'Темп накоплений',
    value: 25,
    maxValue: 30,
    status: 'good',
    description: 'Хороший темп накоплений',
    icon: <TrendingUp color="primary" />,
  },
  {
    name: 'Экстренный фонд',
    value: 60,
    maxValue: 100,
    status: 'warning',
    description: 'Рекомендуется увеличить экстренный фонд',
    icon: <Warning color="warning" />,
  },
  {
    name: 'Инвестиционная активность',
    value: 10,
    maxValue: 100,
    status: 'critical',
    description: 'Низкая инвестиционная активность',
    icon: <Error color="error" />,
  },
]

const getStatusColor = (status: HealthMetric['status']) => {
  switch (status) {
    case 'excellent':
      return '#10b981'
    case 'good':
      return '#0ea5e9'
    case 'warning':
      return '#f59e0b'
    case 'critical':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

const getStatusLabel = (status: HealthMetric['status']) => {
  switch (status) {
    case 'excellent':
      return 'Отлично'
    case 'good':
      return 'Хорошо'
    case 'warning':
      return 'Внимание'
    case 'critical':
      return 'Критично'
    default:
      return 'Неизвестно'
  }
}

export function FinancialHealthPanel() {
  const overallScore = Math.round(
    healthMetrics.reduce((sum, metric) => sum + (metric.value / metric.maxValue) * 100, 0) / healthMetrics.length
  )

  const getOverallStatus = (): { status: HealthMetric['status']; label: string } => {
    if (overallScore >= 80) return { status: 'excellent', label: 'Отличное' }
    if (overallScore >= 60) return { status: 'good', label: 'Хорошее' }
    if (overallScore >= 40) return { status: 'warning', label: 'Требует внимания' }
    return { status: 'critical', label: 'Критическое' }
  }

  const overallStatus = getOverallStatus()

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Финансовое здоровье
          </Typography>
          <Chip
            label={`${overallScore}/100`}
            color={overallStatus.status as any}
            sx={{ ml: 'auto' }}
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h2" sx={{ fontWeight: 'bold', color: getStatusColor(overallStatus.status) }}>
                {overallScore}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Общий балл
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {overallStatus.label} финансовое состояние
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box>
              {healthMetrics.map((metric, index) => (
                <motion.div
                  key={metric.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ mr: 1 }}>{metric.icon}</Box>
                      <Typography variant="subtitle2" sx={{ flex: 1 }}>
                        {metric.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {metric.value}%
                      </Typography>
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={(metric.value / metric.maxValue) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getStatusColor(metric.status),
                        },
                      }}
                    />
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {metric.description}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* Recommendations */}
        <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Рекомендации
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp color="primary" />
                <Typography variant="body2">
                  Увеличьте экстренный фонд до 6 месячных расходов
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="success" />
                <Typography variant="body2">
                  Рассмотрите инвестиционные возможности
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  )
}
