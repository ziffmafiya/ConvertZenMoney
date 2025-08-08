'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material'
import {
  Api,
  Add,
  Link,
  LinkOff,
  Code,
  Webhook,
  Security,
  Settings,
  Delete,
  Edit,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface APIIntegration {
  id: string
  name: string
  description: string
  apiKey: string
  webhookUrl: string
  isActive: boolean
  lastUsed: string
  requestsCount: number
  service: 'google-sheets' | 'zapier' | 'ifttt' | 'custom'
}

const mockIntegrations: APIIntegration[] = [
  {
    id: '1',
    name: 'Google Sheets Sync',
    description: 'Автоматическая синхронизация с Google Таблицами',
    apiKey: 'sk-...abc123',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/123456/abc123/',
    isActive: true,
    lastUsed: '2024-01-15T10:30:00',
    requestsCount: 1247,
    service: 'google-sheets'
  },
  {
    id: '2',
    name: 'Zapier Automation',
    description: 'Интеграция с Zapier для автоматизации',
    apiKey: 'sk-...def456',
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/789012/def456/',
    isActive: true,
    lastUsed: '2024-01-14T16:45:00',
    requestsCount: 892,
    service: 'zapier'
  },
  {
    id: '3',
    name: 'Custom Webhook',
    description: 'Пользовательский webhook для внешней системы',
    apiKey: 'sk-...ghi789',
    webhookUrl: 'https://api.example.com/webhook/finance',
    isActive: false,
    lastUsed: '2024-01-10T09:15:00',
    requestsCount: 156,
    service: 'custom'
  }
]

const availableServices = [
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Синхронизация с Google Таблицами',
    icon: '📊',
    color: '#4285f4'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Автоматизация рабочих процессов',
    icon: '⚡',
    color: '#ff4a00'
  },
  {
    id: 'ifttt',
    name: 'IFTTT',
    description: 'If This Then That автоматизация',
    icon: '🔗',
    color: '#0099ff'
  },
  {
    id: 'custom',
    name: 'Пользовательский API',
    description: 'Подключение к внешним системам',
    icon: '🔧',
    color: '#6b7280'
  }
]

export function APIIntegrations() {
  const [integrations, setIntegrations] = useState<APIIntegration[]>(mockIntegrations)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showApiKey, setShowApiKey] = useState<{ [key: string]: boolean }>({})
  const [editingIntegration, setEditingIntegration] = useState<APIIntegration | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    apiKey: '',
    webhookUrl: '',
    service: 'custom' as APIIntegration['service'],
    isActive: true
  })

  const handleAddIntegration = () => {
    const newIntegration: APIIntegration = {
      id: Date.now().toString(),
      ...formData,
      lastUsed: new Date().toISOString(),
      requestsCount: 0
    }
    
    setIntegrations([...integrations, newIntegration])
    setShowAddDialog(false)
    setFormData({ name: '', description: '', apiKey: '', webhookUrl: '', service: 'custom', isActive: true })
    toast.success('API интеграция добавлена')
  }

  const handleEditIntegration = () => {
    if (editingIntegration) {
      setIntegrations(integrations.map(integration => 
        integration.id === editingIntegration.id 
          ? { ...integration, ...formData }
          : integration
      ))
      setShowAddDialog(false)
      setEditingIntegration(null)
      setFormData({ name: '', description: '', apiKey: '', webhookUrl: '', service: 'custom', isActive: true })
      toast.success('API интеграция обновлена')
    }
  }

  const handleDeleteIntegration = (integrationId: string) => {
    setIntegrations(integrations.filter(integration => integration.id !== integrationId))
    toast.success('API интеграция удалена')
  }

  const handleToggleActive = (integrationId: string) => {
    setIntegrations(integrations.map(integration => 
      integration.id === integrationId 
        ? { ...integration, isActive: !integration.isActive }
        : integration
    ))
    toast.success('Статус интеграции изменен')
  }

  const handleOpenDialog = (integration?: APIIntegration) => {
    if (integration) {
      setEditingIntegration(integration)
      setFormData({
        name: integration.name,
        description: integration.description,
        apiKey: integration.apiKey,
        webhookUrl: integration.webhookUrl,
        service: integration.service,
        isActive: integration.isActive
      })
    } else {
      setEditingIntegration(null)
      setFormData({ name: '', description: '', apiKey: '', webhookUrl: '', service: 'custom', isActive: true })
    }
    setShowAddDialog(true)
  }

  const toggleApiKeyVisibility = (integrationId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }))
  }

  const getServiceInfo = (serviceId: string) => {
    return availableServices.find(service => service.id === serviceId)
  }

  const activeIntegrations = integrations.filter(integration => integration.isActive)
  const totalRequests = integrations.reduce((sum, integration) => sum + integration.requestsCount, 0)

  return (
    <Grid container spacing={3}>
      {/* Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Api sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">API интеграции</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDialog()}
              >
                Добавить интеграцию
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {integrations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего интеграций
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                    {activeIntegrations.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных интеграций
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0ea5e9' }}>
                    {totalRequests.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Всего запросов
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Integrations List */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Настроенные интеграции
            </Typography>
            
            {integrations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Нет настроенных API интеграций
                </Typography>
              </Box>
            ) : (
              <List>
                <AnimatePresence>
                  {integrations.map((integration, index) => (
                    <motion.div
                      key={integration.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemIcon>
                          <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: 2, 
                            backgroundColor: getServiceInfo(integration.service)?.color || '#6b7280',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.2rem'
                          }}>
                            {getServiceInfo(integration.service)?.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {integration.name}
                              </Typography>
                              <Chip
                                label={integration.isActive ? 'Активна' : 'Неактивна'}
                                size="small"
                                color={integration.isActive ? 'success' : 'default'}
                                variant="outlined"
                              />
                              <Chip
                                label={getServiceInfo(integration.service)?.name}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {integration.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                API Key: {showApiKey[integration.id] ? integration.apiKey : 'sk-...' + integration.apiKey.slice(-6)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Webhook: {integration.webhookUrl}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Последнее использование: {new Date(integration.lastUsed).toLocaleString()} • 
                                Запросов: {integration.requestsCount.toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title={showApiKey[integration.id] ? 'Скрыть API ключ' : 'Показать API ключ'}>
                              <IconButton 
                                size="small" 
                                onClick={() => toggleApiKeyVisibility(integration.id)}
                              >
                                {showApiKey[integration.id] ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Редактировать">
                              <IconButton 
                                size="small" 
                                onClick={() => handleOpenDialog(integration)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={integration.isActive ? 'Деактивировать' : 'Активировать'}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleToggleActive(integration.id)}
                                color={integration.isActive ? 'warning' : 'success'}
                              >
                                {integration.isActive ? <LinkOff /> : <Link />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Удалить">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteIntegration(integration.id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < integrations.length - 1 && <Divider />}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Available Services */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Доступные сервисы
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Выберите сервис для интеграции
            </Typography>

            <Grid container spacing={2}>
              {availableServices.map((service, index) => (
                <Grid item xs={12} sm={6} md={3} key={service.id}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: service.color,
                          backgroundColor: `${service.color}08`,
                        }
                      }}
                      onClick={() => handleOpenDialog()}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h3" sx={{ mb: 2 }}>
                          {service.icon}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {service.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {service.description}
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

      {/* API Documentation */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Code sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">API документация</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Используйте наш API для интеграции с внешними системами
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Базовый URL
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', p: 1, borderRadius: 1 }}>
                    https://api.finance-analyzer.com/v1
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Аутентификация
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.2)', p: 1, borderRadius: 1 }}>
                    Authorization: Bearer YOUR_API_KEY
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Button variant="outlined" startIcon={<Code />}>
                Открыть документацию
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Security Info */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Security sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Безопасность API</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Мы обеспечиваем безопасность ваших API ключей и данных
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Все API ключи шифруются и хранятся безопасно
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Rate limiting для предотвращения злоупотреблений
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Логирование всех API запросов для аудита
              </Typography>
              <Typography component="li" variant="body2">
                Возможность отзыва API ключей в любое время
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Add/Edit Integration Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingIntegration ? 'Редактировать интеграцию' : 'Добавить новую интеграцию'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Сервис</InputLabel>
                <Select
                  value={formData.service}
                  label="Сервис"
                  onChange={(e) => setFormData({ ...formData, service: e.target.value as APIIntegration['service'] })}
                >
                  {availableServices.map(service => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.icon} {service.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название интеграции"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Моя интеграция"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Описание"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание интеграции"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="API ключ"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                type="password"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Webhook URL"
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://hooks.example.com/webhook"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Активна"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={editingIntegration ? handleEditIntegration : handleAddIntegration} 
            variant="contained"
            disabled={!formData.name || !formData.apiKey}
          >
            {editingIntegration ? 'Сохранить' : 'Добавить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
