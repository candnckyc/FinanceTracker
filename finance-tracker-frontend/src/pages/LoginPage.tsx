// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { LoginRequest } from '../types';
import logger from '../utils/logger';

// Validation schema with Yup
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Geçerli bir email adresi giriniz')
    .required('Email zorunludur'),
  password: yup
    .string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .required('Şifre zorunludur')
});

// Form data type (inferred from schema)
type LoginFormData = yup.InferType<typeof loginSchema>;

const LoginPage: React.FC = () => {
  // Component lifecycle logging
  useEffect(() => {
    logger.componentMount('LoginPage');
    logger.info('User navigated to login page', undefined, 'LoginPage', 'PAGE_LOAD');
    
    return () => {
      logger.componentUnmount('LoginPage');
    };
  }, []);

  // Hooks
  const navigate = useNavigate();
  const { login, user } = useAuth();
  
  // Local state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form handling with react-hook-form + TypeScript
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onChange', // Validate on change for better UX
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Watch form values for logging
  const watchedValues = watch();

  // Log form changes (debounced to avoid spam)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (watchedValues.email || watchedValues.password) {
        logger.debug('Form data changed', 
          { 
            hasEmail: !!watchedValues.email, 
            hasPassword: !!watchedValues.password,
            emailLength: watchedValues.email?.length || 0
          }, 
          'LoginPage', 
          'FORM_CHANGE'
        );
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [watchedValues]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      logger.info('User already authenticated, redirecting to dashboard', 
        { userId: user.id }, 
        'LoginPage', 
        'AUTO_REDIRECT'
      );
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Form submission handler
  const onSubmit = async (data: LoginFormData): Promise<void> => {
    const perfId = logger.performanceStart('login_form_submit');
    
    try {
      setIsLoading(true);
      setError(null);
      
      logger.userAction('submit_login_form', 'LoginPage', { email: data.email });
      logger.info('Login form submitted', { email: data.email }, 'LoginPage', 'FORM_SUBMIT');

      // Call login from AuthContext
      await login(data);
      
      logger.performanceEnd(perfId, 'login_form_submit');
      logger.info('Login successful, navigating to dashboard', undefined, 'LoginPage', 'LOGIN_SUCCESS');
      
      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error: any) {
      logger.performanceEnd(perfId, 'login_form_submit');
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0] || 
                          error.message || 
                          'Giriş yapılırken bir hata oluştu';
      
      logger.error('Login failed', {
        error: errorMessage,
        status: error.response?.status,
        email: data.email
      }, 'LoginPage', 'LOGIN_ERROR');
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Password visibility toggle
  const handleTogglePasswordVisibility = (): void => {
    logger.userAction('toggle_password_visibility', 'LoginPage', { visible: !showPassword });
    setShowPassword(!showPassword);
  };

  // Navigation handlers
  const handleNavigateToRegister = (): void => {
    logger.userAction('navigate_to_register', 'LoginPage');
    logger.navigation('login', 'register');
    navigate('/register');
  };

  // Error dismissal
  const handleDismissError = (): void => {
    logger.userAction('dismiss_error', 'LoginPage');
    setError(null);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* Header */}
          <LoginIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Giriş Yap
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Finance Tracker hesabınıza giriş yapın
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ width: '100%', mb: 2 }}
              onClose={handleDismissError}
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box 
            component="form" 
            onSubmit={handleSubmit(onSubmit)} 
            sx={{ width: '100%' }}
          >
            {/* Email Field */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email Adresi"
                  type="email"
                  margin="normal"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color={errors.email ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                  }}
                  onChange={(e) => {
                    field.onChange(e);
                    logger.debug('Email field changed', 
                      { length: e.target.value.length }, 
                      'LoginPage', 
                      'EMAIL_INPUT'
                    );
                  }}
                />
              )}
            />

            {/* Password Field */}
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  margin="normal"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color={errors.password ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  onChange={(e) => {
                    field.onChange(e);
                    logger.debug('Password field changed', 
                      { length: e.target.value.length }, 
                      'LoginPage', 
                      'PASSWORD_INPUT'
                    );
                  }}
                />
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading || !isValid}
              onClick={() => logger.userAction('click_submit_button', 'LoginPage')}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Giriş Yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>

            <Divider sx={{ my: 2 }}>veya</Divider>

            {/* Register Link */}
            <Button
              fullWidth
              variant="outlined"
              onClick={handleNavigateToRegister}
              disabled={isLoading}
            >
              Hesap Oluştur
            </Button>
          </Box>

          {/* Development Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, width: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                Debug: Form Valid: {isValid.toString()} | 
                Errors: {Object.keys(errors).length} |
                Loading: {isLoading.toString()}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;