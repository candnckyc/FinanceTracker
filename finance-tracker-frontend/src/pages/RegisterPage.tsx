// src/pages/RegisterPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  LinearProgress
} from '@mui/material';
import {
  Email,
  Lock,
  Person,
  Visibility,
  VisibilityOff,
  PersonAdd
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { RegisterRequest } from '../types';
import logger from '../utils/logger';

// Password strength checker
const checkPasswordStrength = (password: string): { score: number; text: string; color: string } => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strength = [
    { text: 'Çok Zayıf', color: 'error.main' },
    { text: 'Zayıf', color: 'error.main' },
    { text: 'Orta', color: 'warning.main' },
    { text: 'İyi', color: 'info.main' },
    { text: 'Güçlü', color: 'success.main' }
  ];

  return { score, ...strength[score] };
};

// Validation schema
const registerSchema = yup.object({
  firstName: yup
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(50, 'Ad en fazla 50 karakter olmalıdır')
    .required('Ad zorunludur'),
  lastName: yup
    .string()
    .min(2, 'Soyad en az 2 karakter olmalıdır')
    .max(50, 'Soyad en fazla 50 karakter olmalıdır')
    .required('Soyad zorunludur'),
  email: yup
    .string()
    .email('Geçerli bir email adresi giriniz')
    .required('Email zorunludur'),
  password: yup
    .string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Şifre en az 1 küçük harf, 1 büyük harf ve 1 rakam içermelidir')
    .required('Şifre zorunludur'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Şifreler eşleşmiyor')
    .required('Şifre tekrarı zorunludur')
});

type RegisterFormData = yup.InferType<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  // Component lifecycle
  useEffect(() => {
    logger.componentMount('RegisterPage');
    logger.info('User navigated to register page', undefined, 'RegisterPage', 'PAGE_LOAD');
    
    return () => {
      logger.componentUnmount('RegisterPage');
    };
  }, []);

  // Hooks
  const navigate = useNavigate();
  const { register: registerUser, user } = useAuth();
  
  // Local state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Form handling
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const watchedPassword = watch('password');
  const passwordStrength = watchedPassword ? checkPasswordStrength(watchedPassword) : null;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      logger.info('User already authenticated, redirecting to dashboard', 
        { userId: user.id }, 
        'RegisterPage', 
        'AUTO_REDIRECT'
      );
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Form submission
  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    const perfId = logger.performanceStart('register_form_submit');
    
    try {
      setIsLoading(true);
      setError(null);
      
      logger.userAction('submit_register_form', 'RegisterPage', { 
        email: data.email, 
        firstName: data.firstName,
        lastName: data.lastName 
      });
      
      // Remove confirmPassword from request
      const { confirmPassword, ...registerData } = data;
      
      logger.info('Registration form submitted', { 
        email: data.email, 
        firstName: data.firstName,
        passwordStrength: passwordStrength?.score 
      }, 'RegisterPage', 'FORM_SUBMIT');

      await registerUser(registerData);
      
      logger.performanceEnd(perfId, 'register_form_submit');
      logger.info('Registration successful, navigating to dashboard', undefined, 'RegisterPage', 'REGISTER_SUCCESS');
      
      navigate('/dashboard');
      
    } catch (error: any) {
      logger.performanceEnd(perfId, 'register_form_submit');
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0] || 
                          error.message || 
                          'Kayıt olurken bir hata oluştu';
      
      logger.error('Registration failed', {
        error: errorMessage,
        status: error.response?.status,
        email: data.email
      }, 'RegisterPage', 'REGISTER_ERROR');
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers
  const handleTogglePasswordVisibility = (): void => {
    logger.userAction('toggle_password_visibility', 'RegisterPage', { visible: !showPassword });
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = (): void => {
    logger.userAction('toggle_confirm_password_visibility', 'RegisterPage', { visible: !showConfirmPassword });
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleNavigateToLogin = (): void => {
    logger.userAction('navigate_to_login', 'RegisterPage');
    logger.navigation('register', 'login');
    navigate('/login');
  };

  const handleDismissError = (): void => {
    logger.userAction('dismiss_error', 'RegisterPage');
    setError(null);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
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
          <PersonAdd sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Hesap Oluştur
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Finance Tracker'a hoş geldiniz
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

          {/* Register Form */}
          <Box 
            component="form" 
            onSubmit={handleSubmit(onSubmit)} 
            sx={{ width: '100%' }}
          >
            {/* First Name */}
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Ad"
                  margin="normal"
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color={errors.firstName ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Last Name */}
            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Soyad"
                  margin="normal"
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color={errors.lastName ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Email */}
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
                />
              )}
            />

            {/* Password */}
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
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Password Strength Indicator */}
            {passwordStrength && watchedPassword && (
              <Box sx={{ mt: 1, mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Şifre Gücü:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(passwordStrength.score / 4) * 100}
                    sx={{ 
                      flexGrow: 1, 
                      mr: 2,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: passwordStrength.color
                      }
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    sx={{ color: passwordStrength.color, fontWeight: 'bold' }}
                  >
                    {passwordStrength.text}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Confirm Password */}
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Şifre Tekrarı"
                  type={showConfirmPassword ? 'text' : 'password'}
                  margin="normal"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color={errors.confirmPassword ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleToggleConfirmPasswordVisibility}
                          edge="end"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
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
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Hesap Oluşturuluyor...
                </>
              ) : (
                'Hesap Oluştur'
              )}
            </Button>

            <Divider sx={{ my: 2 }}>veya</Divider>

            {/* Login Link */}
            <Button
              fullWidth
              variant="outlined"
              onClick={handleNavigateToLogin}
              disabled={isLoading}
            >
              Giriş Yap
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;