'use client'

import { useState } from 'react'
import { Box, Container, Grid, Paper, Typography, Card, CardContent, CardHeader } from '@mui/material'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { KPICard } from '@/components/dashboard/kpi-card'
import { CashflowChart } from '@/components/dashboard/cashflow-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { AIRecommendations } from '@/components/dashboard/ai-recommendations'

import { useQuery } from '@tanstack/react-query'
import { getMonthlySummary } from '@/lib/api/summary'
import { getTransactions } from '@/lib/api/transactions'

const MotionPaper = motion(Paper)

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })

  // Fetch dashboard data
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['monthly-summary', selectedPeriod],
    queryFn: () => getMonthlySummary(selectedPeriod.month, selectedPeriod.year),
  })

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions', selectedPeriod],
    queryFn: () => getTransactions({ limit: 10 }),
  })

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
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="h3" component="h1" className="tracking-tight">
                  Обзор финансов
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Обзор ваших финансов за {selectedPeriod.month}/{selectedPeriod.year}
                </Typography>
              </div>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <motion.div variants={itemVariants}>
              <KPICard
                title="Баланс"
                value={summary?.netBalance || 0}
                change={summary?.balanceChange || 0}
                type="balance"
                loading={summaryLoading}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title="Доходы"
                value={summary?.totalIncome || 0}
                change={summary?.incomeChange || 0}
                type="income"
                loading={summaryLoading}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title="Расходы"
                value={summary?.totalExpenses || 0}
                change={summary?.expensesChange || 0}
                type="expenses"
                loading={summaryLoading}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <KPICard
                title="Сбережения"
                value={summary?.savings || 0}
                change={summary?.savingsChange || 0}
                type="savings"
                loading={summaryLoading}
              />
            </motion.div>
          </div>

          {/* Main Content */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Cashflow Chart */}
            <div className="col-span-4">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <Typography variant="h6" component="h3">Денежный поток</Typography>
                    <Typography variant="body2" color="text.secondary">Движение средств за выбранный период</Typography>
                  </CardHeader>
                  <CardContent sx={{ pl: 2 }}>
                    <CashflowChart data={summary?.cashflowData} />
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* AI Recommendations */}
            <div className="col-span-3">
              <motion.div variants={itemVariants}>
                <AIRecommendations />
              </motion.div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div variants={itemVariants}>
              <RecentTransactions 
                transactions={transactions} 
                loading={transactionsLoading} 
              />
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </DashboardLayout>
  )
}
