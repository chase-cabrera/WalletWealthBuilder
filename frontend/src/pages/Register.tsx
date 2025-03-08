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
  Grid,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ModernBackground from '../components/auth/ModernBackground';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      setError(null);
      setLoading(true);
      
      await register(email, password, firstName, lastName);
      
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || 'Registration failed. Please try again.');
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
          maxWidth: 550,
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
            Create Account
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: 'rgba(0, 0, 0, 0.7)',
              fontWeight: 500,
              mb: 1
            }}
          >
            Join us to start managing your finances
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="primary" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ style: { color: 'black', backgroundColor: 'white' } }}
                sx={{
                  mb: 2,
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
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="primary" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ style: { color: 'black', backgroundColor: 'white' } }}
                sx={{
                  mb: 2,
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
            </Grid>
          </Grid>
          
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
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
            autoComplete="new-password"
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
          
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="primary" />
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
            {loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(0, 0, 0, 0.7)',
                fontWeight: 500,
              }}
            >
              Already have an account?{' '}
              <MuiLink 
                component={Link} 
                to="/login" 
                underline="hover"
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.main'
                }}
              >
                Login here
              </MuiLink>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </ModernBackground>
  );
};

export default Register; 