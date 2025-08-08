'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Collapse,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  AccountBalance,
  Savings,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { formatCurrency, formatPercentage } from '@/lib/utils/format'

interface BudgetStatus {
  category: string
  budgeted: number
  spent: number
  remaining: number
  percentage: number
  status: 'under' | 'over' | 'warning'
}

const mockBudgetData: BudgetStatus[] = [
  {
    category: 'Продукты',
    budgeted: 15000,
    spent: 12000,
    remaining: 3000,
    percentage: 80,
    status: 'under'
  },
  {
    category: 'Транспорт',
    budgeted: 8000,
    spent: 7500,
    remaining: 500,
    percentage: 94,
    status: 'warning'
  },
  {
    category: 'Развлечения',
    budgeted: 5000,
    spent: 5500,
    remaining: -500,
    percentage: 110,
    status: 'over'
  },
  {
    category: 'Жилье',
    budgeted: 25000,
    spent: 25000,
    remaining: 0,
    percentage: 100,
    status: 'warning'
  },
  {
    category: 'Здоровье',
    budgeted: 3000,
    spent: 1500,
    remaining: 1500,
    percentage: 50,
    status: 'under'
  }
]

const getStatusColor = (status: BudgetStatus['status']) => {
  switch (status) {
    case 'under':
      return '#10b981'
    case 'warning':
      return '#f59e0b'
    case 'over':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

const getStatusIcon = (status: BudgetStatus['status']) => {
  switch (status) {
    case 'under':
      return <CheckCircle fontSize="small" />
    case 'warning':
      return <Warning fontSize="small" />
    case 'over':
      return <TrendingDown fontSize="small" />
    default:
      return <CheckCircle fontSize="small" />
  }
}

export function BudgetOverview() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const totalBudgeted = mockBudgetData.reduce((sum, item) => sum + item.budgeted, 0)
  const totalSpent = mockBudgetData.reduce((sum, item) => sum + item.spent, 0)
  const totalRemaining = totalBudgeted - totalSpent
  const overallPercentage = (totalSpent / totalBudgeted) * 100

  const handleExpand = (category: string) => {
    setExpanded(expanded === category ? null : category)
  }

  const getOverallStatus = () => {
    if (overallPercentage > 100) return 'over'
    if (overallPercentage > 90) return 'warning'
    return 'under'
  }

  return (
    <Grid container spacing={3}>
      {/* Overall Budget Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Общий бюджет за месяц</Typography>
            </Box>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {formatCurrency(totalBudgeted)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Запланировано
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: getStatusColor(getOverallStatus()) }}>
                    {formatCurrency(totalSpent)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Потрачено
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: totalRemaining >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(Math.abs(totalRemaining))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {totalRemaining >= 0 ? 'Осталось' : 'Перерасход'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Прогресс</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatPercentage(overallPercentage)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(overallPercentage, 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getStatusColor(getOverallStatus()),
                  }
                }}
              />
            </Box>

            {getOverallStatus() === 'over' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Внимание! Вы превысили месячный бюджет на {formatCurrency(Math.abs(totalRemaining))}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Category Breakdown */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Детализация по категориям
            </Typography>
            
            {mockBudgetData.map((item, index) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {item.category}
                      </Typography>
                      <Chip
                        icon={getStatusIcon(item.status)}
                        label={item.status === 'under' ? 'В норме' : item.status === 'warning' ? 'Внимание' : 'Превышен'}
                        size="small"
                        color={item.status === 'under' ? 'success' : item.status === 'warning' ? 'warning' : 'error'}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(item.spent)} / {formatCurrency(item.budgeted)}
                      </Typography>
                      <IconButton size="small" onClick={() => handleExpand(item.category)}>
                        {expanded === item.category ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(item.percentage, 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getStatusColor(item.status),
                      }
                    }}
                  />

                  <Collapse in={expanded === item.category}>
                    <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Осталось
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatCurrency(item.remaining)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Процент использования
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatPercentage(item.percentage)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                </Box>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Savings sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Быстрые действия</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Управляйте своим бюджетом эффективно
            </Typography>
            {/* TODO: Add quick action buttons */}
          </CardContent>
        </Card>
      </Grid>

      {/* Budget Tips */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Советы по бюджету
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Отслеживайте расходы ежедневно
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Установите лимиты для каждой категории
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Откладывайте 20% от дохода
              </Typography>
              <Typography component="li" variant="body2">
                Регулярно пересматривайте бюджет
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
