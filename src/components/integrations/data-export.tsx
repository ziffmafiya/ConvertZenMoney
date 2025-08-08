'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
} from '@mui/material'
import {
  Download,
  PictureAsPdf,
  TableChart,
  Description,
  Google,
  DateRange,
  FilterList,
  Settings,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  extension: string
}

interface ExportFilter {
  dateFrom: string
  dateTo: string
  categories: string[]
  accounts: string[]
  includeIncome: boolean
  includeExpenses: boolean
}

const exportFormats: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV файл',
    description: 'Простой текстовый формат для Excel',
    icon: <Description />,
    extension: '.csv'
  },
  {
    id: 'excel',
    name: 'Excel файл',
    description: 'Нативный формат Microsoft Excel',
    icon: <TableChart />,
    extension: '.xlsx'
  },
  {
    id: 'pdf',
    name: 'PDF отчет',
    description: 'Красивый отчет с графиками',
    icon: <PictureAsPdf />,
    extension: '.pdf'
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Экспорт в Google Таблицы',
    icon: <Google />,
    extension: ''
  }
]

const availableCategories = [
  'Продукты', 'Транспорт', 'Развлечения', 'Жилье', 'Здоровье', 
  'Образование', 'Покупки', 'Доходы', 'Сбережения'
]

const availableAccounts = [
  'Основной счет', 'Сберегательный счет', 'Кредитная карта', 'Наличные'
]

export function DataExport() {
  const [selectedFormat, setSelectedFormat] = useState<string>('csv')
  const [filters, setFilters] = useState<ExportFilter>({
    dateFrom: '',
    dateTo: '',
    categories: [],
    accounts: [],
    includeIncome: true,
    includeExpenses: true
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false)
      toast.success(`Экспорт завершен! Файл сохранен как transactions${exportFormats.find(f => f.id === selectedFormat)?.extension}`)
    }, 2000)
  }

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const handleAccountToggle = (account: string) => {
    setFilters(prev => ({
      ...prev,
      accounts: prev.accounts.includes(account)
        ? prev.accounts.filter(a => a !== account)
        : [...prev.accounts, account]
    }))
  }

  const selectedFormatData = exportFormats.find(f => f.id === selectedFormat)

  return (
    <Grid container spacing={3}>
      {/* Export Formats */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Формат экспорта
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Выберите формат для экспорта ваших финансовых данных
            </Typography>

            <Grid container spacing={2}>
              {exportFormats.map((format) => (
                <Grid item xs={12} sm={6} md={3} key={format.id}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      variant={selectedFormat === format.id ? 'outlined' : 'elevation'}
                      sx={{
                        cursor: 'pointer',
                        borderColor: selectedFormat === format.id ? 'primary.main' : 'transparent',
                        backgroundColor: selectedFormat === format.id ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        }
                      }}
                      onClick={() => setSelectedFormat(format.id)}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Box sx={{ color: 'primary.main', mb: 1 }}>
                          {format.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {format.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {format.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Export Filters */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Фильтры экспорта
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Настройте параметры для экспорта данных
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Дата начала"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Дата окончания"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Типы транзакций
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.includeIncome}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeIncome: e.target.checked }))}
                  />
                }
                label="Включить доходы"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.includeExpenses}
                    onChange={(e) => setFilters(prev => ({ ...prev, includeExpenses: e.target.checked }))}
                  />
                }
                label="Включить расходы"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Categories Filter */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Категории
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Выберите категории для экспорта (оставьте пустым для всех)
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableCategories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  size="small"
                  variant={filters.categories.includes(category) ? 'filled' : 'outlined'}
                  color={filters.categories.includes(category) ? 'primary' : 'default'}
                  onClick={() => handleCategoryToggle(category)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            {filters.categories.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Выбрано категорий: {filters.categories.length}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Accounts Filter */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Счета
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Выберите счета для экспорта (оставьте пустым для всех)
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {availableAccounts.map((account) => (
                <Chip
                  key={account}
                  label={account}
                  size="small"
                  variant={filters.accounts.includes(account) ? 'filled' : 'outlined'}
                  color={filters.accounts.includes(account) ? 'primary' : 'default'}
                  onClick={() => handleAccountToggle(account)}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>

            {filters.accounts.length > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Выбрано счетов: {filters.accounts.length}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Export Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">
                Сводка экспорта
              </Typography>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleExport}
                disabled={isExporting}
                size="large"
              >
                {isExporting ? 'Экспорт...' : 'Экспортировать'}
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Settings />
                    </ListItemIcon>
                    <ListItemText
                      primary="Формат"
                      secondary={selectedFormatData?.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <DateRange />
                    </ListItemIcon>
                    <ListItemText
                      primary="Период"
                      secondary={
                        filters.dateFrom && filters.dateTo
                          ? `${filters.dateFrom} - ${filters.dateTo}`
                          : 'Весь период'
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <FilterList />
                    </ListItemIcon>
                    <ListItemText
                      primary="Фильтры"
                      secondary={
                        <>
                          {filters.includeIncome && filters.includeExpenses
                            ? 'Доходы и расходы'
                            : filters.includeIncome
                            ? 'Только доходы'
                            : filters.includeExpenses
                            ? 'Только расходы'
                            : 'Нет данных'}
                        </>
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Предварительная информация
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • Примерное количество записей: 1,247
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    • Размер файла: ~2.3 МБ
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Время экспорта: ~30 секунд
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Export History */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              История экспортов
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <Description />
                </ListItemIcon>
                <ListItemText
                  primary="transactions_2024_01.csv"
                  secondary="Экспортировано 15 января 2024, 14:30 • 1,247 записей"
                />
                <Button size="small" startIcon={<Download />}>
                  Скачать
                </Button>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <PictureAsPdf />
                </ListItemIcon>
                <ListItemText
                  primary="financial_report_2023_12.pdf"
                  secondary="Экспортировано 31 декабря 2023, 23:45 • 2,156 записей"
                />
                <Button size="small" startIcon={<Download />}>
                  Скачать
                </Button>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <TableChart />
                </ListItemIcon>
                <ListItemText
                  primary="budget_analysis_2023_11.xlsx"
                  secondary="Экспортировано 30 ноября 2023, 09:15 • 987 записей"
                />
                <Button size="small" startIcon={<Download />}>
                  Скачать
                </Button>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
