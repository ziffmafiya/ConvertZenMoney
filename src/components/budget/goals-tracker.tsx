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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  TrendingUp,
  Flag,
  CalendarToday,
  AttachMoney,
  CheckCircle,
  Schedule,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
  priority: 'low' | 'medium' | 'high'
  category: string
  status: 'active' | 'completed' | 'paused'
  monthlyContribution: number
}

const mockGoals: FinancialGoal[] = [
  {
    id: '1',
    name: 'Накопить на отпуск',
    targetAmount: 50000,
    currentAmount: 35000,
    deadline: '2024-06-15',
    priority: 'high',
    category: 'Отдых',
    status: 'active',
    monthlyContribution: 5000
  },
  {
    id: '2',
    name: 'Покупка автомобиля',
    targetAmount: 300000,
    currentAmount: 120000,
    deadline: '2025-03-01',
    priority: 'medium',
    category: 'Транспорт',
    status: 'active',
    monthlyContribution: 15000
  },
  {
    id: '3',
    name: 'Создание подушки безопасности',
    targetAmount: 100000,
    currentAmount: 100000,
    deadline: '2024-12-31',
    priority: 'high',
    category: 'Сбережения',
    status: 'completed',
    monthlyContribution: 10000
  },
  {
    id: '4',
    name: 'Ремонт квартиры',
    targetAmount: 200000,
    currentAmount: 45000,
    deadline: '2024-08-30',
    priority: 'medium',
    category: 'Жилье',
    status: 'active',
    monthlyContribution: 20000
  }
]

const getPriorityColor = (priority: FinancialGoal['priority']) => {
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

const getPriorityLabel = (priority: FinancialGoal['priority']) => {
  switch (priority) {
    case 'high':
      return 'Высокий'
    case 'medium':
      return 'Средний'
    case 'low':
      return 'Низкий'
    default:
      return 'Неизвестно'
  }
}

const getStatusColor = (status: FinancialGoal['status']) => {
  switch (status) {
    case 'active':
      return '#0ea5e9'
    case 'completed':
      return '#10b981'
    case 'paused':
      return '#f59e0b'
    default:
      return '#6b7280'
  }
}

const getStatusLabel = (status: FinancialGoal['status']) => {
  switch (status) {
    case 'active':
      return 'Активна'
    case 'completed':
      return 'Завершена'
    case 'paused':
      return 'Приостановлена'
    default:
      return 'Неизвестно'
  }
}

export function GoalsTracker() {
  const [goals, setGoals] = useState<FinancialGoal[]>(mockGoals)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    deadline: '',
    priority: 'medium' as FinancialGoal['priority'],
    category: '',
    monthlyContribution: 0
  })

  const handleOpenDialog = (goal?: FinancialGoal) => {
    if (goal) {
      setEditingGoal(goal)
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline,
        priority: goal.priority,
        category: goal.category,
        monthlyContribution: goal.monthlyContribution
      })
    } else {
      setEditingGoal(null)
      setFormData({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        deadline: '',
        priority: 'medium',
        category: '',
        monthlyContribution: 0
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingGoal(null)
  }

  const handleSaveGoal = () => {
    if (editingGoal) {
      setGoals(goals.map(goal => 
        goal.id === editingGoal.id 
          ? { ...goal, ...formData }
          : goal
      ))
    } else {
      const newGoal: FinancialGoal = {
        id: Date.now().toString(),
        ...formData,
        status: 'active'
      }
      setGoals([...goals, newGoal])
    }
    handleCloseDialog()
  }

  const handleDeleteGoal = (goalId: string) => {
    setGoals(goals.filter(goal => goal.id !== goalId))
  }

  const calculateProgress = (goal: FinancialGoal) => {
    return (goal.currentAmount / goal.targetAmount) * 100
  }

  const calculateCompletionDate = (goal: FinancialGoal) => {
    const remaining = goal.targetAmount - goal.currentAmount
    const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution)
    const completionDate = new Date()
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded)
    return completionDate
  }

  const isOnTrack = (goal: FinancialGoal) => {
    const completionDate = calculateCompletionDate(goal)
    const deadline = new Date(goal.deadline)
    return completionDate <= deadline
  }

  const totalGoals = goals.length
  const completedGoals = goals.filter(goal => goal.status === 'completed').length
  const activeGoals = goals.filter(goal => goal.status === 'active').length

  return (
    <Grid container spacing={3}>
      {/* Goals Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Flag sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Финансовые цели</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Добавить цель
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {totalGoals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего целей
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                    {activeGoals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0ea5e9' }}>
                    {completedGoals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Завершенных
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Goals List */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <AnimatePresence>
            {goals.map((goal, index) => (
              <Grid item xs={12} md={6} key={goal.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                            {goal.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <Chip
                              label={getPriorityLabel(goal.priority)}
                              size="small"
                              sx={{ 
                                backgroundColor: getPriorityColor(goal.priority),
                                color: 'white',
                                fontWeight: 500
                              }}
                            />
                            <Chip
                              label={getStatusLabel(goal.status)}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                borderColor: getStatusColor(goal.status),
                                color: getStatusColor(goal.status)
                              }}
                            />
                            <Chip
                              label={goal.category}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Редактировать">
                            <IconButton size="small" onClick={() => handleOpenDialog(goal)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton size="small" onClick={() => handleDeleteGoal(goal.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Прогресс
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(calculateProgress(goal), 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: goal.status === 'completed' ? '#10b981' : '#0ea5e9',
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {calculateProgress(goal).toFixed(1)}% выполнено
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday fontSize="small" color="action" />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Дедлайн
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatDate(goal.deadline)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AttachMoney fontSize="small" color="action" />
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                В месяц
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatCurrency(goal.monthlyContribution)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>

                      {goal.status === 'active' && (
                        <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {isOnTrack(goal) ? (
                              <CheckCircle fontSize="small" color="success" />
                            ) : (
                              <Schedule fontSize="small" color="warning" />
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {isOnTrack(goal) ? 'Цель в сроке' : 'Отставание от графика'}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            Ожидаемое завершение: {formatDate(calculateCompletionDate(goal).toISOString())}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      </Grid>

      {/* Add/Edit Goal Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGoal ? 'Редактировать цель' : 'Добавить новую цель'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название цели"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Целевая сумма"
                type="number"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Текущая сумма"
                type="number"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Дедлайн"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ежемесячный взнос"
                type="number"
                value={formData.monthlyContribution}
                onChange={(e) => setFormData({ ...formData, monthlyContribution: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={formData.priority}
                  label="Приоритет"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as FinancialGoal['priority'] })}
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Категория"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSaveGoal} variant="contained">
            {editingGoal ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
