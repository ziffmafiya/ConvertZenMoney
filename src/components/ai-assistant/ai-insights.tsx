'use client'

import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Warning,
  CheckCircle,
  Psychology,
} from '@mui/icons-material'
import { motion } from 'framer-motion'

interface Insight {
  id: string
  type: 'positive' | 'negative' | 'opportunity' | 'warning'
  title: string
  description: string
  impact: string
  icon: React.ReactNode
  confidence: number
}

const insights: Insight[] = [
  {
    id: '1',
    type: 'positive',
    title: 'Отличный темп накоплений',
    description: 'Вы сохраняете 25% от дохода, что выше среднего показателя',
    impact: '+15% к финансовой безопасности',
    icon: <TrendingUp color="success" />,
    confidence: 95,
  },
  {
    id: '2',
    type: 'opportunity',
    title: 'Потенциал для инвестиций',
    description: 'У вас есть свободные средства для инвестирования',
    impact: 'Потенциальный доход +12% годовых',
    icon: <Lightbulb color="primary" />,
    confidence: 87,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Рост расходов на развлечения',
    description: 'Расходы на развлечения выросли на 25%',
    impact: '-2,500 грн к потенциальным накоплениям',
    icon: <Warning color="warning" />,
    confidence: 92,
  },
  {
    id: '4',
    type: 'negative',
    title: 'Низкая инвестиционная активность',
    description: 'Только 5% средств инвестируется',
    impact: 'Потеря потенциального дохода',
    icon: <TrendingDown color="error" />,
    confidence: 78,
  },
]

const getTypeColor = (type: Insight['type']) => {
  switch (type) {
    case 'positive':
      return '#10b981'
    case 'negative':
      return '#ef4444'
    case 'opportunity':
      return '#0ea5e9'
    case 'warning':
      return '#f59e0b'
    default:
      return '#6b7280'
  }
}

export function AIInsights() {
  return (
    <Card sx={{ height: 600 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Psychology sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">AI Инсайты</Typography>
          <Chip
            label={`${insights.length} инсайтов`}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>

        <List sx={{ maxHeight: 500, overflow: 'auto' }}>
          {insights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 1,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {insight.icon}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {insight.title}
                      </Typography>
                      <Chip
                        label={`${insight.confidence}%`}
                        size="small"
                        sx={{
                          backgroundColor: getTypeColor(insight.type),
                          color: 'white',
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {insight.description}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: getTypeColor(insight.type),
                          fontWeight: 500,
                        }}
                      >
                        {insight.impact}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < insights.length - 1 && <Divider />}
            </motion.div>
          ))}
        </List>

        {/* Summary */}
        <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Общий анализ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI обнаружил {insights.filter(i => i.type === 'positive').length} положительных трендов и{' '}
            {insights.filter(i => i.type === 'warning' || i.type === 'negative').length} областей для улучшения.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
