'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Restaurant,
  DirectionsCar,
  Movie,
  ShoppingCart,
  Home,
  LocalHospital,
  School,
  Flight,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { formatCurrency, formatPercentage } from '@/lib/utils/format'

interface CategoryData {
  name: string
  value: number
  color: string
  icon: React.ReactNode
  percentage: number
}

const mockData: CategoryData[] = [
  {
    name: 'Продукты',
    value: 8500,
    color: '#10b981',
    icon: <Restaurant />,
    percentage: 24.3,
  },
  {
    name: 'Транспорт',
    value: 7200,
    color: '#0ea5e9',
    icon: <DirectionsCar />,
    percentage: 20.6,
  },
  {
    name: 'Развлечения',
    value: 6500,
    color: '#8b5cf6',
    icon: <Movie />,
    percentage: 18.6,
  },
  {
    name: 'Покупки',
    value: 5200,
    color: '#f59e0b',
    icon: <ShoppingCart />,
    percentage: 14.9,
  },
  {
    name: 'Жилье',
    value: 4800,
    color: '#ef4444',
    icon: <Home />,
    percentage: 13.7,
  },
  {
    name: 'Здоровье',
    value: 2100,
    color: '#ec4899',
    icon: <LocalHospital />,
    percentage: 6.0,
  },
  {
    name: 'Образование',
    value: 1200,
    color: '#06b6d4',
    icon: <School />,
    percentage: 3.4,
  },
  {
    name: 'Путешествия',
    value: 500,
    color: '#84cc16',
    icon: <Flight />,
    percentage: 1.4,
  },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]
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
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          {data.name}
        </Typography>
        <Typography variant="body2">
          {formatCurrency(data.value)}
        </Typography>
        <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
          {formatPercentage(data.payload.percentage)}
        </Typography>
      </Box>
    )
  }
  return null
}

export function ExpenseCategoriesChart() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const totalExpenses = mockData.reduce((sum, item) => sum + item.value, 0)

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(selectedCategory === categoryName ? null : categoryName)
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Распределение расходов по категориям
            </Typography>
            
            <Box sx={{ height: 400, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => handleCategoryClick(data.name)}
                  >
                    {mockData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        style={{
                          filter: selectedCategory && selectedCategory !== entry.name
                            ? 'grayscale(100%) opacity(0.3)'
                            : 'none',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Детализация категорий
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatCurrency(totalExpenses)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Общие расходы за период
              </Typography>
            </Box>

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {mockData.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListItem
                    sx={{
                      px: 0,
                      py: 1,
                      cursor: 'pointer',
                      borderRadius: 1,
                      backgroundColor: selectedCategory === category.name
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: category.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        {category.icon}
                      </Box>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {category.name}
                          </Typography>
                          <Chip
                            label={formatPercentage(category.percentage)}
                            size="small"
                            sx={{
                              backgroundColor: category.color,
                              color: 'white',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={formatCurrency(category.value)}
                    />
                  </ListItem>
                </motion.div>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
