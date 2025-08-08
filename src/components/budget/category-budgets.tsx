'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Chip,
  Alert,
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Category,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, formatPercentage } from '@/lib/utils/format'

interface CategoryBudget {
  id: string
  name: string
  limit: number
  spent: number
  color: string
  icon: string
  isActive: boolean
}

const mockCategoryBudgets: CategoryBudget[] = [
  {
    id: '1',
    name: 'Продукты',
    limit: 15000,
    spent: 12000,
    color: '#10b981',
    icon: '🛒',
    isActive: true
  },
  {
    id: '2',
    name: 'Транспорт',
    limit: 8000,
    spent: 7500,
    color: '#0ea5e9',
    icon: '🚗',
    isActive: true
  },
  {
    id: '3',
    name: 'Развлечения',
    limit: 5000,
    spent: 5500,
    color: '#8b5cf6',
    icon: '🎬',
    isActive: true
  },
  {
    id: '4',
    name: 'Жилье',
    limit: 25000,
    spent: 25000,
    color: '#ef4444',
    icon: '🏠',
    isActive: true
  },
  {
    id: '5',
    name: 'Здоровье',
    limit: 3000,
    spent: 1500,
    color: '#f59e0b',
    icon: '💊',
    isActive: true
  },
  {
    id: '6',
    name: 'Одежда',
    limit: 4000,
    spent: 2000,
    color: '#ec4899',
    icon: '👕',
    isActive: false
  }
]

const getStatusColor = (spent: number, limit: number) => {
  const percentage = (spent / limit) * 100
  if (percentage > 100) return '#ef4444'
  if (percentage > 90) return '#f59e0b'
  return '#10b981'
}

const getStatusIcon = (spent: number, limit: number) => {
  const percentage = (spent / limit) * 100
  if (percentage > 100) return <TrendingDown fontSize="small" />
  if (percentage > 90) return <Warning fontSize="small" />
  return <CheckCircle fontSize="small" />
}

const getStatusLabel = (spent: number, limit: number) => {
  const percentage = (spent / limit) * 100
  if (percentage > 100) return 'Превышен'
  if (percentage > 90) return 'Внимание'
  return 'В норме'
}

export function CategoryBudgets() {
  const [categories, setCategories] = useState<CategoryBudget[]>(mockCategoryBudgets)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    limit: 0,
    color: '#0ea5e9',
    icon: '📊',
    isActive: true
  })

  const handleOpenDialog = (category?: CategoryBudget) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        limit: category.limit,
        color: category.color,
        icon: category.icon,
        isActive: category.isActive
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        limit: 0,
        color: '#0ea5e9',
        icon: '📊',
        isActive: true
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingCategory(null)
  }

  const handleSaveCategory = () => {
    if (editingCategory) {
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ))
    } else {
      const newCategory: CategoryBudget = {
        id: Date.now().toString(),
        ...formData,
        spent: 0
      }
      setCategories([...categories, newCategory])
    }
    handleCloseDialog()
  }

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId))
  }

  const handleToggleActive = (categoryId: string) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, isActive: !cat.isActive }
        : cat
    ))
  }

  const totalBudget = categories.filter(cat => cat.isActive).reduce((sum, cat) => sum + cat.limit, 0)
  const totalSpent = categories.filter(cat => cat.isActive).reduce((sum, cat) => sum + cat.spent, 0)
  const totalRemaining = totalBudget - totalSpent
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const activeCategories = categories.filter(cat => cat.isActive)
  const overBudgetCategories = activeCategories.filter(cat => cat.spent > cat.limit)

  return (
    <Grid container spacing={3}>
      {/* Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Category sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Бюджет по категориям</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Добавить категорию
              </Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {formatCurrency(totalBudget)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Общий лимит
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: getStatusColor(totalSpent, totalBudget) }}>
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
                <Typography variant="body2">Общий прогресс</Typography>
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
                    backgroundColor: getStatusColor(totalSpent, totalBudget),
                  }
                }}
              />
            </Box>

            {overBudgetCategories.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Внимание! {overBudgetCategories.length} категори{overBudgetCategories.length === 1 ? 'я' : 'й'} превышена
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Categories Grid */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <AnimatePresence>
            {categories.map((category, index) => (
              <Grid item xs={12} md={6} lg={4} key={category.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card sx={{ 
                    opacity: category.isActive ? 1 : 0.6,
                    position: 'relative'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h4">{category.icon}</Typography>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {category.name}
                            </Typography>
                            <Chip
                              icon={getStatusIcon(category.spent, category.limit)}
                              label={getStatusLabel(category.spent, category.limit)}
                              size="small"
                              color={category.spent > category.limit ? 'error' : category.spent > category.limit * 0.9 ? 'warning' : 'success'}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Редактировать">
                            <IconButton size="small" onClick={() => handleOpenDialog(category)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={category.isActive ? 'Деактивировать' : 'Активировать'}>
                            <IconButton 
                              size="small" 
                              onClick={() => handleToggleActive(category.id)}
                              sx={{ 
                                color: category.isActive ? 'success.main' : 'text.secondary'
                              }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Удалить">
                            <IconButton size="small" onClick={() => handleDeleteCategory(category.id)}>
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
                            {formatCurrency(category.spent)} / {formatCurrency(category.limit)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((category.spent / category.limit) * 100, 100)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStatusColor(category.spent, category.limit),
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {((category.spent / category.limit) * 100).toFixed(1)}% использовано
                        </Typography>
                      </Box>

                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                        borderRadius: 1,
                        border: `1px solid ${category.color}20`
                      }}>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Осталось
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatCurrency(Math.max(0, category.limit - category.spent))}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Перерасход
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: category.spent > category.limit ? '#ef4444' : 'inherit' }}>
                              {category.spent > category.limit ? formatCurrency(category.spent - category.limit) : '0 ₴'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      </Grid>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Редактировать категорию' : 'Добавить новую категорию'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название категории"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Месячный лимит"
                type="number"
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Иконка (эмодзи)"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="📊"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Цвет (hex)"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#0ea5e9"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleSaveCategory} variant="contained">
            {editingCategory ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
