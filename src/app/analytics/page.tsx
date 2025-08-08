'use client'

import { useState } from 'react'
import { Container, Grid, Typography, Box, Paper, Tabs, Tab } from '@mui/material'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ExpenseCategoriesChart } from '@/components/analytics/expense-categories-chart'
import { SeasonalityHeatmap } from '@/components/analytics/seasonality-heatmap'
import { CashflowAnalysis } from '@/components/analytics/cashflow-analysis'
import { PeriodComparison } from '@/components/analytics/period-comparison'
import { FinancialHealthPanel } from '@/components/analytics/financial-health-panel'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

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
              Аналитика
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Глубокий анализ ваших финансовых данных
            </Typography>
          </motion.div>

          {/* Financial Health Panel */}
          <motion.div variants={itemVariants}>
            <FinancialHealthPanel />
          </motion.div>

          {/* Tabs */}
          <motion.div variants={itemVariants}>
            <Paper sx={{ mt: 4 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="analytics tabs"
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="Категории расходов" />
                <Tab label="Сезонность" />
                <Tab label="Cashflow анализ" />
                <Tab label="Сравнение периодов" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <ExpenseCategoriesChart />
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <SeasonalityHeatmap />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <CashflowAnalysis />
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <PeriodComparison />
              </TabPanel>
            </Paper>
          </motion.div>
        </motion.div>
      </Container>
    </DashboardLayout>
  )
}
