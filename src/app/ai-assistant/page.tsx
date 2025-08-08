'use client'

import { useState } from 'react'
import { Container, Grid, Typography, Box, Paper } from '@mui/material'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AIChatBot } from '@/components/ai-assistant/ai-chat-bot'
import { AIInsights } from '@/components/ai-assistant/ai-insights'
import { FinancialScenarios } from '@/components/ai-assistant/financial-scenarios'

export default function AIAssistantPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Typography variant="h3" component="h1" gutterBottom>
              AI-Ассистент
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Персональный финансовый помощник с искусственным интеллектом
            </Typography>
          </motion.div>

          <Grid container spacing={3}>
            {/* AI Chat Bot */}
            <Grid item xs={12} lg={8}>
              <motion.div variants={itemVariants}>
                <AIChatBot />
              </motion.div>
            </Grid>

            {/* AI Insights */}
            <Grid item xs={12} lg={4}>
              <motion.div variants={itemVariants}>
                <AIInsights />
              </motion.div>
            </Grid>

            {/* Financial Scenarios */}
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <FinancialScenarios />
              </motion.div>
            </Grid>
          </Grid>
        </motion.div>
      </Container>
    </DashboardLayout>
  )
}
