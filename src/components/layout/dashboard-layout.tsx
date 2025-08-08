'use client'

import { useState } from 'react'
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  Analytics,
  AccountBalance,
  Flag,
  SmartToy,
  Settings,
  Notifications,
  Person,
  Logout,
  Brightness4,
  Brightness7,
} from '@mui/icons-material'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const drawerWidth = 280

const menuItems = [
  { text: 'Дашборд', icon: <Dashboard />, path: '/' },
  { text: 'Аналитика', icon: <Analytics />, path: '/analytics' },
  { text: 'Бюджет и цели', icon: <Flag />, path: '/budget' },
  { text: 'AI-Ассистент', icon: <SmartToy />, path: '/ai-assistant' },
  { text: 'Интеграции', icon: <AccountBalance />, path: '/integrations' },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const pathname = usePathname()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'sidebar.DEFAULT' }}>
      {/* Logo */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'sidebar.border' }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'sidebar.primary' }}>
          Finance Analyzer
        </Typography>
        <Typography variant="body2" color="sidebar.foreground">
          Умный финансовый анализатор
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, pt: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={pathname === item.path}
              sx={{
                mx: 1,
                borderRadius: 2,
                color: 'sidebar.foreground',
                '&.Mui-selected': {
                  backgroundColor: 'sidebar.accent',
                  color: 'sidebar.accent-foreground',
                  '&:hover': {
                    backgroundColor: 'sidebar.accent',
                  },
                },
                '&:hover': {
                  backgroundColor: 'sidebar.accent',
                  color: 'sidebar.accent-foreground',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: pathname === item.path ? 'inherit' : 'sidebar.foreground',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* User Profile */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'sidebar.border' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ mr: 2, bgcolor: 'sidebar.primary' }}>U</Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'sidebar.foreground' }}>
              Пользователь
            </Typography>
            <Typography variant="caption" color="sidebar.foreground">
              user@example.com
            </Typography>
          </Box>
        </Box>
        <ListItemButton
          onClick={() => handleNavigation('/settings')}
          sx={{ 
            borderRadius: 2,
            color: 'sidebar.foreground',
            '&:hover': {
              backgroundColor: 'sidebar.accent',
              color: 'sidebar.accent-foreground',
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="Настройки" />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === pathname)?.text || 'Дашборд'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit">
              <Notifications />
            </IconButton>
            <IconButton color="inherit">
              <Brightness4 />
            </IconButton>
            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // AppBar height
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleNavigation('/profile')}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          Профиль
        </MenuItem>
        <MenuItem onClick={() => handleNavigation('/settings')}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Настройки
        </MenuItem>
        <Divider />
        <MenuItem>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Выйти
        </MenuItem>
      </Menu>
    </Box>
  )
}
