'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Slider,
  TextField,
  Chip,
  LinearProgress,
} from '@mui/material'
import {
  TrendingUp,
  TrendingDown,
  Calculate,
  Timeline,
  Savings,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils/format'

interface Scenario {
  id: string
  title: string
  description: string
  currentValue: number
  targetValue: number
  impact: number
  icon: React.ReactNode
}

const scenarios: Scenario[] = [
  {
    id: '1',
    title: 'Сокращение расходов на кофе',
    description: 'Уменьшение трат на кофе на 30%',
    currentValue: 1500,
    targetValue: 1050,
    impact: 450,
    icon: <TrendingDown color="error" />,
  },
  {
    id: '2',
    title: 'Увеличение накоплений',
    description: 'Увеличение процента накоплений с 25% до 30%',
    currentValue: 20000,
    targetValue: 24000,
    impact: 4000,
    icon: <TrendingUp color="success" />,
  },
  {
    id: '3',
    title: 'Инвестиции в депозит',
    description: 'Размещение 50,000 грн под 12% годовых',
    currentValue: 0,
    targetValue: 6000,
    impact: 6000,
    icon: <Savings color="primary" />,
  },
]

export function FinancialScenarios() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [customValue, setCustomValue] = useState<number>(0)

  const handleScenarioClick = (scenarioId: string) => {
    setSelectedScenario(selectedScenario === scenarioId ? null : scenarioId)
  }

  const calculateImpact = (scenario: Scenario, value: number) => {
    const percentage = value / 100
    return scenario.impact * percentage
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Calculate sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">Финансовые сценарии "Что если"</Typography>
        </Box>

        <Grid container spacing={3}>
          {scenarios.map((scenario, index) => (
            <Grid item xs={12} md={4} key={scenario.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedScenario === scenario.id ? 2 : 1,
                    borderColor: selectedScenario === scenario.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease',
                    },
                  }}
                  onClick={() => handleScenarioClick(scenario.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {scenario.icon}
                      <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 600 }}>
                        {scenario.title}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {scenario.description}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        {formatCurrency(scenario.impact)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Потенциальная экономия/доход в год
                      </Typography>
                    </Box>

                    {selectedScenario === scenario.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="body2" gutterBottom>
                            Настройте параметры:
                          </Typography>
                          
                          <Slider
                            value={customValue}
                            onChange={(_, value) => setCustomValue(value as number)}
                            min={0}
                            max={100}
                            step={5}
                            marks={[
                              { value: 0, label: '0%' },
                              { value: 50, label: '50%' },
                              { value: 100, label: '100%' },
                            ]}
                            sx={{ mb: 2 }}
                          />
                          
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                              {formatCurrency(calculateImpact(scenario, customValue))}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Результат при {customValue}% изменении
                            </Typography>
                          </Box>
                        </Box>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Summary */}
        {selectedScenario && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 24 }}
          >
            <Card sx={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Timeline sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Прогноз на 5 лет</Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {formatCurrency(calculateImpact(scenarios.find(s => s.id === selectedScenario)!, customValue) * 5)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Общий эффект за 5 лет
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        +{Math.round((customValue / 100) * 15)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Рост финансовой безопасности
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                        -{Math.round((customValue / 100) * 8)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Снижение долговой нагрузки
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
