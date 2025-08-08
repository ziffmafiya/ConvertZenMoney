'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Skeleton,
  Divider,
} from '@mui/material'
import {
  Search,
  Receipt,
  ShoppingCart,
  Restaurant,
  DirectionsCar,
  Home,
  Movie,
  MoreVert,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  account: string
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'продукты':
    case 'еда':
      return <Restaurant />
    case 'транспорт':
      return <DirectionsCar />
    case 'развлечения':
      return <Movie />
    case 'покупки':
      return <ShoppingCart />
    case 'жилье':
    case 'коммунальные':
      return <Home />
    default:
      return <Receipt />
  }
}

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'продукты':
    case 'еда':
      return '#10b981'
    case 'транспорт':
      return '#0ea5e9'
    case 'развлечения':
      return '#8b5cf6'
    case 'покупки':
      return '#f59e0b'
    case 'жилье':
    case 'коммунальные':
      return '#ef4444'
    default:
      return '#6b7280'
  }
}

interface RecentTransactionsProps {
  transactions?: Transaction[]
  loading?: boolean
}

export function RecentTransactions({ transactions = [], loading = false }: RecentTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['all', ...Array.from(new Set(transactions.map(t => t.category)))]

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Последние транзакции
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
          </Box>
          <List>
            {[1, 2, 3, 4, 5].map((i) => (
              <ListItem key={i} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Skeleton variant="circular" width={40} height={40} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Skeleton variant="text" width="60%" />}
                  secondary={<Skeleton variant="text" width="40%" />}
                />
                <Skeleton variant="text" width={80} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Последние транзакции
        </Typography>

        {/* Search and Filters */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Поиск транзакций..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {categories.map((category) => (
              <Chip
                key={category}
                label={category === 'all' ? 'Все' : category}
                size="small"
                onClick={() => setSelectedCategory(category)}
                color={selectedCategory === category ? 'primary' : 'default'}
                variant={selectedCategory === category ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </Box>

        {/* Transactions List */}
        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          <AnimatePresence>
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
              >
                <ListItem
                  sx={{
                    px: 0,
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        backgroundColor: getCategoryColor(transaction.category),
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getCategoryIcon(transaction.category)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {transaction.description}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(transaction.date)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.account}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: transaction.type === 'income' ? '#10b981' : '#ef4444',
                      }}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </Typography>
                    <IconButton size="small">
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
                {index < filteredTransactions.length - 1 && <Divider />}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredTransactions.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Транзакции не найдены
              </Typography>
            </Box>
          )}
        </List>
      </CardContent>
    </Card>
  )
}
