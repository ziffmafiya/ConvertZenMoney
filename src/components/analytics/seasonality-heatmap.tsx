'use client'

import { Card, CardContent, Typography, Box } from '@mui/material'
import { motion } from 'framer-motion'

export function SeasonalityHeatmap() {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Сезонность и тренды
        </Typography>
        <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Тепловая карта сезонности в разработке
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
