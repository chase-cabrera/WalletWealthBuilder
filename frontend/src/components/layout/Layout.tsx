import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, useMediaQuery, useTheme, CssBaseline } from '@mui/material';
import Sidebar from './Sidebar';
import authService from '../../services/authService';
import Navbar from './Navbar';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  
  // Close sidebar on mobile by default
  React.useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setDrawerOpen(true);
    }
  }, [isMobile]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Don't show sidebar and navbar on login and register pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  if (isAuthPage || !user) {
    return <>{children}</>;
  }
  
  // Completely revised layout structure
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <Navbar onMenuToggle={handleDrawerToggle} />
      
      {isAuthenticated && (
        <Sidebar 
          open={isMobile ? drawerOpen : true} 
          variant={isMobile ? "temporary" : "permanent"}
          onClose={() => setDrawerOpen(false)} 
        />
      )}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          mt: '64px',
          p: 3,
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
};

export default Layout; 