'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import {
  Lightbulb,
  TrendingUp,
  Warning,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  SmartToy,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface Recommendation {
  id: string
  type: 'tip' | 'warning' | 'success' | 'insight'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  icon: string
  action?: string
}

const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    type: 'tip',
    title: 'Оптимизация расходов',
    description: 'Ваши расходы на развлечения выросли на 25% по сравнению с прошлым месяцем. Рассмотрите возможность сокращения.',
    priority: 'high',
    icon: '💡',
  },
  {
    id: '2',
    type: 'success',
    title: 'Отличный прогресс!',
    description: 'Вы достигли 80% от цели по накоплениям. Продолжайте в том же духе!',
    priority: 'medium',
    icon: '🎯',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Внимание к бюджету',
    description: 'Расходы на транспорт превысили лимит на 15%. Рекомендуем пересмотреть траты.',
    priority: 'high',
    icon: '⚠️',
  },
  {
    id: '4',
    type: 'insight',
    title: 'Инвестиционная возможность',
    description: 'У вас есть свободные средства. Рассмотрите возможность инвестирования в депозит под 12% годовых.',
    priority: 'medium',
    icon: '📈',
  },
]

const getTypeConfig = (type: Recommendation['type']) => {
  switch (type) {
    case 'tip':
      return { color: '#0ea5e9', bgColor: 'rgba(14, 165, 233, 0.1)' }
    case 'warning':
      return { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' }
    case 'success':
      return { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' }
    case 'insight':
      return { color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' }
    default:
      return { color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' }
  }
}

const getPriorityColor = (priority: Recommendation['priority']) => {
  switch (priority) {
    case 'high':
      return '#ef4444'
    case 'medium':
      return '#f59e0b'
    case 'low':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

export function AIRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Имитация загрузки данных
    const timer = setTimeout(() => {
      setRecommendations(mockRecommendations)
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id)
  }

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">AI Рекомендации</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  height: 80,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 2,
                  animation: 'pulse 2s infinite',
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">AI Рекомендации</Typography>
          <Chip
            label={recommendations.length}
            size="small"
            sx={{ ml: 'auto', backgroundColor: 'primary.main', color: 'white' }}
          />
        </Box>

        <AnimatePresence>
          {recommendations.map((recommendation, index) => {
            const config = getTypeConfig(recommendation.type)
            const isExpanded = expanded === recommendation.id

            return (
              <motion.div
                key={recommendation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    mb: 2,
                    border: `1px solid ${config.color}20`,
                    backgroundColor: config.bgColor,
                    '&:hover': {
                      borderColor: config.color,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Typography variant="h5" sx={{ mt: -0.5 }}>
                        {recommendation.icon}
                      </Typography>
                      
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {recommendation.title}
                          </Typography>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: getPriorityColor(recommendation.priority),
                            }}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {recommendation.description}
                        </Typography>
                        
                        <Collapse in={isExpanded}>
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <Typography variant="caption" color="text.secondary">
                              Рекомендуемые действия:
                            </Typography>
                            <List dense sx={{ mt: 1 }}>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <CheckCircle fontSize="small" color="success" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Проанализируйте траты за неделю"
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <TrendingUp fontSize="small" color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary="Установите лимиты по категориям"
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            </List>
                          </Box>
                        </Collapse>
                      </Box>
                      
                      <IconButton
                        size="small"
                        onClick={() => handleExpand(recommendation.id)}
                        sx={{ color: config.color }}
                      >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
