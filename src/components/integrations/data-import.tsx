'use client'

import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material'
import {
  CloudUpload,
  Description,
  TableChart,
  Google,
  CheckCircle,
  Error,
  Warning,
  FileUpload,
  Settings,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

interface ImportedFile {
  id: string
  name: string
  size: number
  type: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  records?: number
  errors?: string[]
}

interface ColumnMapping {
  [key: string]: string
}

const supportedFormats = [
  { name: 'CSV файлы', extensions: ['.csv'], icon: <Description /> },
  { name: 'Excel файлы', extensions: ['.xlsx', '.xls'], icon: <TableChart /> },
  { name: 'Google Sheets', extensions: [], icon: <Google /> },
]

const columnMappingOptions = [
  { value: 'date', label: 'Дата' },
  { value: 'description', label: 'Описание' },
  { value: 'amount', label: 'Сумма' },
  { value: 'category', label: 'Категория' },
  { value: 'account', label: 'Счет' },
  { value: 'type', label: 'Тип (доход/расход)' },
]

export function DataImport() {
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([])
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ImportedFile | null>(null)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [previewData, setPreviewData] = useState<any[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: ImportedFile[] = acceptedFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0
    }))

    setImportedFiles(prev => [...prev, ...newFiles])
    
    // Simulate file processing
    newFiles.forEach(file => {
      simulateFileProcessing(file.id)
    })

    toast.success(`${acceptedFiles.length} файл(ов) загружено`)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  })

  const simulateFileProcessing = (fileId: string) => {
    setImportedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, status: 'processing', progress: 0 }
          : file
      )
    )

    const interval = setInterval(() => {
      setImportedFiles(prev => {
        const updatedFiles = prev.map(file => {
          if (file.id === fileId) {
            const newProgress = file.progress + Math.random() * 30
            if (newProgress >= 100) {
              clearInterval(interval)
              return {
                ...file,
                status: 'completed' as const,
                progress: 100,
                records: Math.floor(Math.random() * 1000) + 100
              } as ImportedFile
            }
            return { ...file, progress: newProgress }
          }
          return file
        })
        return updatedFiles
      })
    }, 200)
  }

  const handleFileAction = (fileId: string, action: 'map' | 'delete') => {
    if (action === 'map') {
      const file = importedFiles.find(f => f.id === fileId)
      if (file) {
        setSelectedFile(file)
        setShowMappingDialog(true)
        // Generate preview data
        setPreviewData([
          { date: '2024-01-15', description: 'Продукты', amount: -1500, category: 'Продукты', account: 'Основной счет' },
          { date: '2024-01-15', description: 'Зарплата', amount: 50000, category: 'Доходы', account: 'Основной счет' },
          { date: '2024-01-14', description: 'Транспорт', amount: -800, category: 'Транспорт', account: 'Основной счет' },
        ])
      }
    } else if (action === 'delete') {
      setImportedFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('Файл удален')
    }
  }

  const handleMappingSave = () => {
    if (selectedFile) {
      setImportedFiles(prev => 
        prev.map(file => 
          file.id === selectedFile.id 
            ? { ...file, status: 'completed' }
            : file
        )
      )
      toast.success('Сопоставление колонок сохранено')
    }
    setShowMappingDialog(false)
    setSelectedFile(null)
  }

  const getStatusIcon = (status: ImportedFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />
      case 'error':
        return <Error color="error" />
      case 'processing':
        return <Warning color="warning" />
      default:
        return <FileUpload color="action" />
    }
  }

  const getStatusColor = (status: ImportedFile['status']) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      case 'processing':
        return 'warning'
      default:
        return 'default'
    }
  }

  return (
    <Grid container spacing={3}>
      {/* Upload Area */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Импорт данных
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Загрузите файлы с финансовыми данными для анализа
            </Typography>

            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(25, 118, 210, 0.04)',
                }
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Отпустите файлы здесь' : 'Перетащите файлы сюда или нажмите для выбора'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Поддерживаемые форматы: CSV, Excel (.xlsx, .xls)
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Supported Formats */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Поддерживаемые форматы
            </Typography>
            <List>
              {supportedFormats.map((format, index) => (
                <ListItem key={index}>
                  <ListItemIcon>{format.icon}</ListItemIcon>
                  <ListItemText 
                    primary={format.name}
                    secondary={format.extensions.length > 0 ? `Расширения: ${format.extensions.join(', ')}` : 'Подключение через API'}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Import Tips */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Советы по импорту
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Убедитесь, что файл содержит колонки: дата, описание, сумма
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Суммы должны быть числовыми значениями
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Даты должны быть в формате ГГГГ-ММ-ДД
              </Typography>
              <Typography component="li" variant="body2">
                Максимальный размер файла: 10 МБ
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Imported Files */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Загруженные файлы
            </Typography>
            
            {importedFiles.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Файлы не загружены
                </Typography>
              </Box>
            ) : (
              <List>
                <AnimatePresence>
                  {importedFiles.map((file, index) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemIcon>
                          {getStatusIcon(file.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {file.name}
                              </Typography>
                              <Chip
                                label={file.status === 'completed' ? 'Готово' : 
                                       file.status === 'processing' ? 'Обработка' : 
                                       file.status === 'error' ? 'Ошибка' : 'Ожидает'}
                                size="small"
                                color={getStatusColor(file.status)}
                                variant="outlined"
                              />
                              {file.records && (
                                <Chip
                                  label={`${file.records} записей`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Размер: {(file.size / 1024).toFixed(1)} КБ
                              </Typography>
                              {file.status === 'processing' && (
                                <Box sx={{ mt: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={file.progress}
                                    sx={{ height: 4, borderRadius: 2 }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {file.progress.toFixed(0)}% завершено
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {file.status === 'completed' && (
                            <Button
                              size="small"
                              startIcon={<Settings />}
                              onClick={() => handleFileAction(file.id, 'map')}
                            >
                              Сопоставить
                            </Button>
                          )}
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleFileAction(file.id, 'delete')}
                          >
                            Удалить
                          </Button>
                        </Box>
                      </ListItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Column Mapping Dialog */}
      <Dialog 
        open={showMappingDialog} 
        onClose={() => setShowMappingDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Сопоставление колонок - {selectedFile?.name}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Сопоставление полей
              </Typography>
              {columnMappingOptions.map(option => (
                <FormControl key={option.value} fullWidth sx={{ mb: 2 }}>
                  <InputLabel>{option.label}</InputLabel>
                  <Select
                    value={columnMapping[option.value] || ''}
                    label={option.label}
                    onChange={(e) => setColumnMapping({
                      ...columnMapping,
                      [option.value]: e.target.value
                    })}
                  >
                    <MenuItem value="">Не сопоставлять</MenuItem>
                    <MenuItem value="column1">Колонка 1</MenuItem>
                    <MenuItem value="column2">Колонка 2</MenuItem>
                    <MenuItem value="column3">Колонка 3</MenuItem>
                    <MenuItem value="column4">Колонка 4</MenuItem>
                  </Select>
                </FormControl>
              ))}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Предварительный просмотр
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell>Сумма</TableCell>
                      <TableCell>Категория</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell sx={{ color: row.amount > 0 ? '#10b981' : '#ef4444' }}>
                          {row.amount > 0 ? '+' : ''}{row.amount} ₴
                        </TableCell>
                        <TableCell>{row.category}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMappingDialog(false)}>
            Отмена
          </Button>
          <Button onClick={handleMappingSave} variant="contained">
            Сохранить сопоставление
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
