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
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material'
import {
  AccountBalance,
  Add,
  Link,
  LinkOff,
  Refresh,
  Security,
  Sync,
  Warning,
  CheckCircle,
  Error,
  Settings,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

interface BankConnection {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  balance: number
  lastSync: string
  status: 'connected' | 'disconnected' | 'error' | 'syncing'
  accountType: 'checking' | 'savings' | 'credit'
}

const mockBankConnections: BankConnection[] = [
  {
    id: '1',
    bankName: 'ПриватБанк',
    accountName: 'Основной счет',
    accountNumber: '****1234',
    balance: 45000,
    lastSync: '2024-01-15T10:30:00',
    status: 'connected',
    accountType: 'checking'
  },
  {
    id: '2',
    bankName: 'Монобанк',
    accountName: 'Сберегательный счет',
    accountNumber: '****5678',
    balance: 120000,
    lastSync: '2024-01-15T09:15:00',
    status: 'connected',
    accountType: 'savings'
  },
  {
    id: '3',
    bankName: 'А-Банк',
    accountName: 'Кредитная карта',
    accountNumber: '****9012',
    balance: -5000,
    lastSync: '2024-01-14T16:45:00',
    status: 'error',
    accountType: 'credit'
  }
]

const supportedBanks = [
  { name: 'ПриватБанк', logo: '🏦', supported: true },
  { name: 'Монобанк', logo: '🏦', supported: true },
  { name: 'А-Банк', logo: '🏦', supported: true },
  { name: 'Ощадбанк', logo: '🏦', supported: true },
  { name: 'Укргазбанк', logo: '🏦', supported: false },
  { name: 'Райффайзен Банк', logo: '🏦', supported: true },
]

export function BankConnections() {
  const [connections, setConnections] = useState<BankConnection[]>(mockBankConnections)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [formData, setFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    accountType: 'checking' as BankConnection['accountType']
  })

  const handleAddConnection = () => {
    setIsConnecting(true)
    
    // Simulate connection process
    setTimeout(() => {
      const newConnection: BankConnection = {
        id: Date.now().toString(),
        bankName: formData.bankName,
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        balance: Math.floor(Math.random() * 100000),
        lastSync: new Date().toISOString(),
        status: 'connected',
        accountType: formData.accountType
      }
      
      setConnections([...connections, newConnection])
      setShowAddDialog(false)
      setIsConnecting(false)
      setFormData({ bankName: '', accountName: '', accountNumber: '', accountType: 'checking' })
      toast.success('Банковский счет успешно подключен')
    }, 3000)
  }

  const handleDisconnect = (connectionId: string) => {
    setConnections(connections.map(conn => 
      conn.id === connectionId 
        ? { ...conn, status: 'disconnected' }
        : conn
    ))
    toast.success('Соединение разорвано')
  }

  const handleSync = (connectionId: string) => {
    setConnections(connections.map(conn => 
      conn.id === connectionId 
        ? { ...conn, status: 'syncing' }
        : conn
    ))

    // Simulate sync process
    setTimeout(() => {
      setConnections(connections.map(conn => 
        conn.id === connectionId 
          ? { 
              ...conn, 
              status: 'connected',
              lastSync: new Date().toISOString(),
              balance: Math.floor(Math.random() * 100000)
            }
          : conn
      ))
      toast.success('Данные синхронизированы')
    }, 2000)
  }

  const getStatusIcon = (status: BankConnection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle color="success" />
      case 'disconnected':
        return <LinkOff color="action" />
      case 'error':
        return <Error color="error" />
      case 'syncing':
        return <Sync color="warning" />
      default:
        return <Warning color="warning" />
    }
  }

  const getStatusColor = (status: BankConnection['status']) => {
    switch (status) {
      case 'connected':
        return 'success'
      case 'disconnected':
        return 'default'
      case 'error':
        return 'error'
      case 'syncing':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: BankConnection['status']) => {
    switch (status) {
      case 'connected':
        return 'Подключено'
      case 'disconnected':
        return 'Отключено'
      case 'error':
        return 'Ошибка'
      case 'syncing':
        return 'Синхронизация'
      default:
        return 'Неизвестно'
    }
  }

  const getAccountTypeLabel = (type: BankConnection['accountType']) => {
    switch (type) {
      case 'checking':
        return 'Расчетный счет'
      case 'savings':
        return 'Сберегательный счет'
      case 'credit':
        return 'Кредитная карта'
      default:
        return 'Неизвестно'
    }
  }

  const connectedAccounts = connections.filter(conn => conn.status === 'connected')
  const totalBalance = connectedAccounts.reduce((sum, conn) => sum + conn.balance, 0)

  return (
    <Grid container spacing={3}>
      {/* Summary */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Банковские подключения</Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddDialog(true)}
              >
                Добавить банк
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {connections.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Подключенных счетов
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#10b981' }}>
                    {connectedAccounts.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Активных соединений
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#0ea5e9' }}>
                    {totalBalance.toLocaleString()} ₴
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Общий баланс
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Connected Accounts */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Подключенные счета
            </Typography>
            
            {connections.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Нет подключенных банковских счетов
                </Typography>
              </Box>
            ) : (
              <List>
                <AnimatePresence>
                  {connections.map((connection, index) => (
                    <motion.div
                      key={connection.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemIcon>
                          {getStatusIcon(connection.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {connection.bankName} - {connection.accountName}
                              </Typography>
                              <Chip
                                label={getStatusLabel(connection.status)}
                                size="small"
                                color={getStatusColor(connection.status)}
                                variant="outlined"
                              />
                              <Chip
                                label={getAccountTypeLabel(connection.accountType)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Счет: {connection.accountNumber} • Баланс: {connection.balance.toLocaleString()} ₴
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Последняя синхронизация: {new Date(connection.lastSync).toLocaleString()}
                              </Typography>
                              {connection.status === 'syncing' && (
                                <Box sx={{ mt: 1 }}>
                                  <LinearProgress sx={{ height: 4, borderRadius: 2 }} />
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {connection.status === 'connected' && (
                              <Tooltip title="Синхронизировать">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleSync(connection.id)}
                                  disabled={connection.status === 'syncing' as BankConnection['status']}
                                >
                                  <Refresh fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Настройки">
                              <IconButton size="small">
                                <Settings fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Отключить">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDisconnect(connection.id)}
                              >
                                <LinkOff fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Supported Banks */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Поддерживаемые банки
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Мы поддерживаем подключение к основным украинским банкам
            </Typography>

            <Grid container spacing={2}>
              {supportedBanks.map((bank, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      variant="outlined"
                      sx={{
                        opacity: bank.supported ? 1 : 0.5,
                        cursor: bank.supported ? 'pointer' : 'not-allowed',
                        '&:hover': bank.supported ? {
                          borderColor: 'primary.main',
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        } : {}
                      }}
                      onClick={() => bank.supported && setShowAddDialog(true)}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography variant="h4" sx={{ mb: 1 }}>
                          {bank.logo}
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                          {bank.name}
                        </Typography>
                        <Chip
                          label={bank.supported ? 'Поддерживается' : 'Скоро'}
                          size="small"
                          color={bank.supported ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Security Info */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Security sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Безопасность</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ваши банковские данные защищены с помощью современных технологий шифрования
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Все соединения защищены протоколом SSL/TLS
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Данные не хранятся на наших серверах
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Используется OAuth 2.0 для безопасной авторизации
              </Typography>
              <Typography component="li" variant="body2">
                Соответствие стандартам PCI DSS
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Add Bank Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Подключить банковский счет
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Банк</InputLabel>
                <Select
                  value={formData.bankName}
                  label="Банк"
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                >
                  {supportedBanks.filter(bank => bank.supported).map(bank => (
                    <MenuItem key={bank.name} value={bank.name}>
                      {bank.logo} {bank.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Название счета"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="Основной счет"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Номер счета"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                placeholder="****1234"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Тип счета</InputLabel>
                <Select
                  value={formData.accountType}
                  label="Тип счета"
                  onChange={(e) => setFormData({ ...formData, accountType: e.target.value as BankConnection['accountType'] })}
                >
                  <MenuItem value="checking">Расчетный счет</MenuItem>
                  <MenuItem value="savings">Сберегательный счет</MenuItem>
                  <MenuItem value="credit">Кредитная карта</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>
            Отмена
          </Button>
          <Button 
            onClick={handleAddConnection} 
            variant="contained"
            disabled={isConnecting || !formData.bankName || !formData.accountName}
          >
            {isConnecting ? 'Подключение...' : 'Подключить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
