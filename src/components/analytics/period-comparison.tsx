'use client'

import { Card, CardContent, Typography, Box } from '@mui/material'
import { motion } from 'framer-motion'

export function PeriodComparison() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Сравнение периодов
        </Typography>
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Сравнение периодов в разработке
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
