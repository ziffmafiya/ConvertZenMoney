'use client'

import { useState } from 'react'
import { Box, Container, Grid, Typography, Tabs, Tab } from '@mui/material'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { BudgetOverview } from '@/components/budget/budget-overview'
import { GoalsTracker } from '@/components/budget/goals-tracker'
import { CategoryBudgets } from '@/components/budget/category-budgets'
import { ZeroBasedBudget } from '@/components/budget/zero-based-budget'

const MotionBox = motion(Box)

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
      id={`budget-tabpanel-${index}`}
      aria-labelledby={`budget-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export default function BudgetPage() {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants}>
            <Typography variant="h3" component="h1" gutterBottom>
              Бюджет и цели
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Управляйте своими расходами и достигайте финансовых целей
            </Typography>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    minWidth: 120,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                  }
                }}
              >
                <Tab label="Обзор бюджета" />
                <Tab label="Категории" />
                <Tab label="Нулевой бюджет" />
                <Tab label="Цели" />
              </Tabs>
            </Box>
          </motion.div>

          <TabPanel value={tabValue} index={0}>
            <motion.div variants={itemVariants}>
              <BudgetOverview />
            </motion.div>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <motion.div variants={itemVariants}>
              <CategoryBudgets />
            </motion.div>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <motion.div variants={itemVariants}>
              <ZeroBasedBudget />
            </motion.div>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <motion.div variants={itemVariants}>
              <GoalsTracker />
            </motion.div>
          </TabPanel>
        </motion.div>
      </Container>
    </DashboardLayout>
  )
}
