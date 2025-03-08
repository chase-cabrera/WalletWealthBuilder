import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link as MuiLink,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import ModernBackground from '../components/auth/ModernBackground';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      
      console.log('Submitting login form with:', { email, password });
      
      const response = await authService.login({ email, password });
      
      login(response);
      
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Failed to login. Please check your credentials.');
      } else {
        setError('Network error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <ModernBackground>
      <Paper 
        elevation={6} 
        sx={{ 
          p: 4, 
          width: '100%',
          maxWidth: 450,
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            fontWeight="bold" 
            color="primary"
            sx={{ fontSize: { xs: '1.8rem', sm: '2.2rem' } }}
          >
            Welcome Back
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(0, 0, 0, 0.7)',
              fontWeight: 500,
              mb: 1
            }}
          >
            Sign in to access your financial dashboard
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="primary" />
                </InputAdornment>
              ),
            }}
            inputProps={{ style: { color: 'black', backgroundColor: 'white' } }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: 2,
              },
              '& .MuiInputBase-input': {
                color: 'rgba(0, 0, 0, 0.87)',
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(0, 0, 0, 0.7)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            inputProps={{ style: { color: 'black', backgroundColor: 'white' } }}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: 2,
              },
              '& .MuiInputBase-input': {
                color: 'rgba(0, 0, 0, 0.87)',
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(0, 0, 0, 0.7)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'primary.main',
              }
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 2, 
              mb: 3, 
              py: 1.5,
              borderRadius: 2,
              fontWeight: 'bold',
              fontSize: '1rem',
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 500,
              }}
            >
              Don't have an account?{' '}
              <MuiLink 
                component={Link} 
                to="/register" 
                underline="hover"
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.main'
                }}
              >
                Register here
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </ModernBackground>
  );
};

export default Login; 