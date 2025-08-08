'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Paper,
  Chip,
} from '@mui/material'
import {
  Send,
  SmartToy,
  Person,
  TrendingUp,
  AccountBalance,
  Receipt,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
  type?: 'text' | 'suggestion'
}

const quickQuestions = [
  'Покажи мои траты на транспорт за июль',
  'Сколько я накоплю через год?',
  'Какие категории расходов самые большие?',
  'Дай рекомендации по экономии',
]

export function AIChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я ваш AI-ассистент по финансам. Чем могу помочь?',
      sender: 'ai',
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Имитация ответа AI
    setTimeout(() => {
      const aiResponse = generateAIResponse(text)
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, aiMessage])
      setIsTyping(false)
    }, 1000 + Math.random() * 2000)
  }

  const generateAIResponse = (userText: string): string => {
    const lowerText = userText.toLowerCase()
    
    if (lowerText.includes('транспорт') || lowerText.includes('траты')) {
      return 'За июль ваши расходы на транспорт составили 7,200 грн. Это на 15% больше, чем в прошлом месяце. Рекомендую рассмотреть альтернативные способы передвижения для экономии.'
    }
    
    if (lowerText.includes('накоплю') || lowerText.includes('накопления')) {
      return 'При текущем темпе накоплений (25% от дохода) через год вы накопите примерно 180,000 грн. Если увеличите процент до 30%, то сможете накопить 216,000 грн.'
    }
    
    if (lowerText.includes('категории') || lowerText.includes('расходы')) {
      return 'Ваши самые большие категории расходов: Продукты (24.3%), Транспорт (20.6%), Развлечения (18.6%). Рекомендую обратить внимание на развлечения - есть потенциал для экономии.'
    }
    
    if (lowerText.includes('экономия') || lowerText.includes('рекомендации')) {
      return 'Вот мои рекомендации по экономии:\n1. Сократите расходы на развлечения на 20%\n2. Используйте общественный транспорт вместо такси\n3. Планируйте покупки продуктов заранее\n4. Рассмотрите возможность рефинансирования кредитов'
    }
    
    return 'Спасибо за вопрос! Я проанализирую ваши данные и предоставлю персонализированные рекомендации. Можете задать более конкретный вопрос о ваших финансах.'
  }

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question)
  }

  return (
    <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ backgroundColor: 'primary.main' }}>
              <SmartToy />
            </Avatar>
            <Box>
              <Typography variant="h6">AI Финансовый Ассистент</Typography>
              <Typography variant="body2" color="text.secondary">
                Онлайн и готов помочь
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Quick Questions */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Быстрые вопросы:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {quickQuestions.map((question, index) => (
              <Chip
                key={index}
                label={question}
                size="small"
                onClick={() => handleQuickQuestion(question)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          <List sx={{ p: 0 }}>
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <ListItem
                    sx={{
                      flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                      px: 0,
                      py: 1,
                    }}
                  >
                    <Avatar
                      sx={{
                        backgroundColor: message.sender === 'user' ? 'primary.main' : 'secondary.main',
                        width: 32,
                        height: 32,
                        mr: message.sender === 'user' ? 0 : 2,
                        ml: message.sender === 'user' ? 2 : 0,
                      }}
                    >
                      {message.sender === 'user' ? <Person /> : <SmartToy />}
                    </Avatar>
                    
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        backgroundColor: message.sender === 'user' 
                          ? 'primary.main' 
                          : 'background.paper',
                        color: message.sender === 'user' ? 'white' : 'inherit',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {message.text}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          opacity: 0.7, 
                          display: 'block', 
                          mt: 1 
                        }}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Paper>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <ListItem sx={{ px: 0, py: 1 }}>
                  <Avatar sx={{ backgroundColor: 'secondary.main', mr: 2 }}>
                    <SmartToy />
                  </Avatar>
                  <Paper sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'text.secondary',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'text.secondary',
                          animation: 'pulse 1.5s infinite 0.2s',
                        }}
                      />
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: 'text.secondary',
                          animation: 'pulse 1.5s infinite 0.4s',
                        }}
                      />
                    </Box>
                  </Paper>
                </ListItem>
              </motion.div>
            )}
          </List>
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Задайте вопрос о ваших финансах..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage(inputValue)
                }
              }}
              disabled={isTyping}
            />
            <IconButton
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              color="primary"
            >
              <Send />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}
