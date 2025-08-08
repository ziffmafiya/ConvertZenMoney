'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Divider,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency } from '@/lib/utils/format'

interface BudgetItem {
  id: string
  name: string
  planned: number
  actual: number
  category: 'income' | 'expense' | 'savings'
  priority: 'essential' | 'important' | 'optional'
  notes?: string
}

const mockBudgetItems: BudgetItem[] = [
  // Income
  {
    id: 'income-1',
    name: 'Зарплата',
    planned: 50000,
    actual: 50000,
    category: 'income',
    priority: 'essential',
    notes: 'Основной доход'
  },
  {
    id: 'income-2',
    name: 'Подработка',
    planned: 10000,
    actual: 8000,
    category: 'income',
    priority: 'important',
    notes: 'Фриланс проекты'
  },
  
  // Essential Expenses
  {
    id: 'expense-1',
    name: 'Аренда жилья',
    planned: 20000,
    actual: 20000,
    category: 'expense',
    priority: 'essential',
    notes: 'Обязательные расходы'
  },
  {
    id: 'expense-2',
    name: 'Коммунальные услуги',
    planned: 5000,
    actual: 4800,
    category: 'expense',
    priority: 'essential',
    notes: 'Электричество, вода, газ'
  },
  {
    id: 'expense-3',
    name: 'Продукты питания',
    planned: 15000,
    actual: 12000,
    category: 'expense',
    priority: 'essential',
    notes: 'Основные продукты'
  },
  {
    id: 'expense-4',
    name: 'Транспорт',
    planned: 8000,
    actual: 7500,
    category: 'expense',
    priority: 'essential',
    notes: 'Общественный транспорт'
  },
  
  // Important Expenses
  {
    id: 'expense-5',
    name: 'Здоровье',
    planned: 3000,
    actual: 1500,
    category: 'expense',
    priority: 'important',
    notes: 'Медицинские расходы'
  },
  {
    id: 'expense-6',
    name: 'Образование',
    planned: 5000,
    actual: 5000,
    category: 'expense',
    priority: 'important',
    notes: 'Курсы и обучение'
  },
  
  // Optional Expenses
  {
    id: 'expense-7',
    name: 'Развлечения',
    planned: 3000,
    actual: 3500,
    category: 'expense',
    priority: 'optional',
    notes: 'Кино, рестораны'
  },
  {
    id: 'expense-8',
    name: 'Покупки',
    planned: 2000,
    actual: 2500,
    category: 'expense',
    priority: 'optional',
    notes: 'Одежда, гаджеты'
  },
  
  // Savings
  {
    id: 'savings-1',
    name: 'Подушка безопасности',
    planned: 5000,
    actual: 5000,
    category: 'savings',
    priority: 'essential',
    notes: 'Резервный фонд'
  },
  {
    id: 'savings-2',
    name: 'Инвестиции',
    planned: 3000,
    actual: 3000,
    category: 'savings',
    priority: 'important',
    notes: 'Долгосрочные инвестиции'
  }
]

const getPriorityColor = (priority: BudgetItem['priority']) => {
  switch (priority) {
    case 'essential':
      return '#ef4444'
    case 'important':
      return '#f59e0b'
    case 'optional':
      return '#10b981'
    default:
      return '#6b7280'
  }
}

const getPriorityLabel = (priority: BudgetItem['priority']) => {
  switch (priority) {
    case 'essential':
      return 'Обязательно'
    case 'important':
      return 'Важно'
    case 'optional':
      return 'Опционально'
    default:
      return 'Неизвестно'
  }
}

const getCategoryIcon = (category: BudgetItem['category']) => {
  switch (category) {
    case 'income':
      return <TrendingUp fontSize="small" />
    case 'expense':
      return <TrendingDown fontSize="small" />
    case 'savings':
      return <CheckCircle fontSize="small" />
    default:
      return null
  }
}

export function ZeroBasedBudget() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(mockBudgetItems)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    planned: 0,
    actual: 0,
    category: 'expense' as BudgetItem['category'],
    priority: 'important' as BudgetItem['priority'],
    notes: ''
  })

  const handleOpenDialog = (item?: BudgetItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        planned: item.planned,
        actual: item.actual,
        category: item.category,
        priority: item.priority,
        notes: item.notes || ''
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        planned: 0,
        actual: 0,
        category: 'expense',
        priority: 'important',
        notes: ''
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingItem(null)
  }

  const handleSaveItem = () => {
    if (editingItem) {
      setBudgetItems(budgetItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...formData }
          : item
      ))
    } else {
      const newItem: BudgetItem = {
        id: Date.now().toString(),
        ...formData
      }
      setBudgetItems([...budgetItems, newItem])
    }
    handleCloseDialog()
  }

  const handleDeleteItem = (itemId: string) => {
    setBudgetItems(budgetItems.filter(item => item.id !== itemId))
  }

  // Calculate totals
  const totalIncome = budgetItems
    .filter(item => item.category === 'income')
    .reduce((sum, item) => sum + item.actual, 0)

  const totalExpenses = budgetItems
    .filter(item => item.category === 'expense')
    .reduce((sum, item) => sum + item.actual, 0)

  const totalSavings = budgetItems
    .filter(item => item.category === 'savings')
    .reduce((sum, item) => sum + item.actual, 0)

  const balance = totalIncome - totalExpenses - totalSavings
  const isBalanced = Math.abs(balance) < 100 // Allow small rounding differences

  const plannedIncome = budgetItems
    .filter(item => item.category === 'income')
    .reduce((sum, item) => sum + item.planned, 0)

  const plannedExpenses = budgetItems
    .filter(item => item.category === 'expense')
    .reduce((sum, item) => sum + item.planned, 0)

  const plannedSavings = budgetItems
    .filter(item => item.category === 'savings')
    .reduce((sum, item) => sum + item.planned, 0)

  const plannedBalance = plannedIncome - plannedExpenses - plannedSavings

  // Group items by category
  const incomeItems = budgetItems.filter(item => item.category === 'income')
  const expenseItems = budgetItems.filter(item => item.category === 'expense')
  const savingsItems = budgetItems.filter(item => item.category === 'savings')

  return (
    <Grid container spacing={3}>
      {/* Zero-Based Budget Explanation */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Нулевой бюджет</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Нулевой бюджет означает, что каждый заработанный доллар имеет назначение. 
              Доходы минус расходы минус сбережения должны равняться нулю.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                    {formatCurrency(totalIncome)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Доходы
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ef4444' }}>
                    {formatCurrency(totalExpenses)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Расходы
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#0ea5e9' }}>
                    {formatCurrency(totalSavings)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Сбережения
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: isBalanced ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(balance)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Баланс
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {!isBalanced && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Внимание! Бюджет не сбалансирован. Разница: {formatCurrency(Math.abs(balance))}
              </Alert>
            )}

            {isBalanced && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Отлично! Ваш бюджет сбалансирован. Каждый доллар имеет назначение.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Income Section */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#10b981' }}>
                Доходы
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Добавить
              </Button>
            </Box>
            
            <List dense>
              <AnimatePresence>
                {incomeItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.name}
                            </Typography>
                            <Chip
                              label={getPriorityLabel(item.priority)}
                              size="small"
                              sx={{ 
                                backgroundColor: getPriorityColor(item.priority),
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              План: {formatCurrency(item.planned)} | Факт: {formatCurrency(item.actual)}
                            </Typography>
                            {item.notes && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < incomeItems.length - 1 && <Divider />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Expenses Section */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#ef4444' }}>
                Расходы
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Добавить
              </Button>
            </Box>
            
            <List dense>
              <AnimatePresence>
                {expenseItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.name}
                            </Typography>
                            <Chip
                              label={getPriorityLabel(item.priority)}
                              size="small"
                              sx={{ 
                                backgroundColor: getPriorityColor(item.priority),
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              План: {formatCurrency(item.planned)} | Факт: {formatCurrency(item.actual)}
                            </Typography>
                            {item.notes && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.notes}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => handleOpenDialog(item)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < expenseItems.length - 1 && <Divider />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Savings Section */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#0ea5e9' }}>
                Сбережения и инвестиции
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Добавить
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              <AnimatePresence>
                {savingsItems.map((item, index) => (
                  <Grid item xs={12} md={6} key={item.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {item.name}
                            </Typography>
                            <Chip
                              label={getPriorityLabel(item.priority)}
                              size="small"
                              sx={{ 
                                backgroundColor: getPriorityColor(item.priority),
                                color: 'white'
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            План: {formatCurrency(item.planned)} | Факт: {formatCurrency(item.actual)}
                          </Typography>
                          {item.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {item.notes}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </AnimatePresence>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Add/Edit Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Редактировать статью' : 'Добавить новую статью'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Планируемая сумма"
                type="number"
                value={formData.planned}
                onChange={(e) => setFormData({ ...formData, planned: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Фактическая сумма"
                type="number"
                value={formData.actual}
                onChange={(e) => setFormData({ ...formData, actual: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={formData.category}
                  label="Категория"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as BudgetItem['category'] })}
                >
                  <MenuItem value="income">Доходы</MenuItem>
                  <MenuItem value="expense">Расходы</MenuItem>
                  <MenuItem value="savings">Сбережения</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={formData.priority}
                  label="Приоритет"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as BudgetItem['priority'] })}
                >
                  <MenuItem value="essential">Обязательно</MenuItem>
                  <MenuItem value="important">Важно</MenuItem>
                  <MenuItem value="optional">Опционально</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Заметки"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {editingItem ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
