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
  PersonAdd,
  AccountCircle,
  CheckCircle,
  Cancel
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import logger from '../utils/logger';

// Types
export interface RegisterFormData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterRequest {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Password strength checker
const checkPasswordStrength = (password: string): { score: number; text: string; color: string } => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strength = [
    { text: 'Çok Zayıf', color: '#f44336' },
    { text: 'Zayıf', color: '#ff9800' },
    { text: 'Orta', color: '#ff9800' },
    { text: 'İyi', color: '#2196f3' },
    { text: 'Güçlü', color: '#4caf50' }
  ];

  return { score, ...strength[score] };
};

// Username availability checker (mock)
const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock some taken usernames
  const takenUsernames = ['admin', 'test', 'user', 'demo'];
  return !takenUsernames.includes(username.toLowerCase());
};

// Validation schema
const registerSchema = yup.object({
  username: yup
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
    .max(30, 'Kullanıcı adı en fazla 30 karakter olmalıdır')
    .matches(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, rakam ve _ içerebilir')
    .required('Kullanıcı adı zorunludur'),
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
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Form handling
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    trigger
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const watchedPassword = watch('password');
  const watchedUsername = watch('username');
  const passwordStrength = watchedPassword ? checkPasswordStrength(watchedPassword) : null;

  // Username availability check
  useEffect(() => {
    const checkUsername = async () => {
      if (watchedUsername && watchedUsername.length >= 3 && !errors.username) {
        setUsernameStatus('checking');
        try {
          const isAvailable = await checkUsernameAvailability(watchedUsername);
          setUsernameStatus(isAvailable ? 'available' : 'taken');
        } catch (error) {
          setUsernameStatus('idle');
        }
      } else {
        setUsernameStatus('idle');
      }
    };

    const timeoutId = setTimeout(checkUsername, 1000);
    return () => clearTimeout(timeoutId);
  }, [watchedUsername, errors.username]);

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
        username: data.username 
      });
      
      logger.info('Registration form submitted', { 
        email: data.email, 
        firstName: data.firstName,
        username: data.username,
        passwordStrength: passwordStrength?.score 
      }, 'RegisterPage', 'FORM_SUBMIT');

      // Check username availability one more time before submitting
      if (usernameStatus === 'taken') {
        throw new Error('Bu kullanıcı adı zaten alınmış');
      }

      // Create API data
      const registerData: RegisterRequest = {
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password
      };

      logger.debug('Registration data being sent', {
        username: registerData.username,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        email: registerData.email,
        passwordLength: registerData.password?.length
      }, 'AUTH', 'REGISTER_DATA');

      await registerUser(registerData);
      
      logger.performanceEnd(perfId, 'register_form_submit');
      logger.info('Registration successful, navigating to dashboard', undefined, 'RegisterPage', 'REGISTER_SUCCESS');
      
      navigate('/dashboard');
      
    } catch (error: any) {
      logger.performanceEnd(perfId, 'register_form_submit');
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.title ||
                          error.message || 
                          'Kayıt olurken bir hata oluştu';
      
      logger.error('Registration failed', {
        error: errorMessage,
        status: error.response?.status,
        email: data.email,
        username: data.username,
        validationErrors: error.response?.data?.errors
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

  // Username status icon
  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <CircularProgress size={20} />;
      case 'available':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'taken':
        return <Cancel sx={{ color: '#f44336' }} />;
      default:
        return null;
    }
  };

  // Username helper text
  const getUsernameHelperText = () => {
    if (errors.username) {
      return errors.username.message;
    }
    switch (usernameStatus) {
      case 'checking':
        return 'Kullanıcı adı kontrol ediliyor...';
      case 'available':
        return 'Bu kullanıcı adı kullanılabilir';
      case 'taken':
        return 'Bu kullanıcı adı zaten alınmış';
      default:
        return 'En az 3 karakter, sadece harf, rakam ve _ kullanın';
    }
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
            {/* Username */}
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Kullanıcı Adı"
                  margin="normal"
                  error={!!errors.username || usernameStatus === 'taken'}
                  helperText={getUsernameHelperText()}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircle color={errors.username || usernameStatus === 'taken' ? 'error' : 'action'} />
                      </InputAdornment>
                    ),
                    endAdornment: watchedUsername && watchedUsername.length >= 3 && (
                      <InputAdornment position="end">
                        {getUsernameStatusIcon()}
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Name Fields */}
            <Box sx={{ display: 'flex', gap: 2 }}>
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
            </Box>

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
              disabled={isLoading || !isValid || usernameStatus === 'taken' || usernameStatus === 'checking'}
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
              Zaten hesabın var mı? Giriş Yap
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;