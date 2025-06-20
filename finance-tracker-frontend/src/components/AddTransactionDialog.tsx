// src/components/AddTransactionDialog.tsx
import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Typography
} from '@mui/material';
import {
  AttachMoney,
  Description,
  Category,
  DateRange,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';

import { TransactionCreateDto, Transaction } from '../types';
import apiService from '../services/api';
import logger from '../utils/logger';

// Transaction categories
const INCOME_CATEGORIES = [
  'Maaş',
  'Freelance',
  'Yatırım',
  'Kira Geliri',
  'Hediye',
  'Satış',
  'Diğer Gelir'
];

const EXPENSE_CATEGORIES = [
  'Market',
  'Restoran',
  'Ulaşım',
  'Faturalar',
  'Kira',
  'Sağlık',
  'Eğlence',
  'Giyim',
  'Teknoloji',
  'Spor',
  'Seyahat',
  'Diğer Gider'
];

// Validation schema
const transactionSchema = yup.object({
  description: yup
    .string()
    .required('Açıklama zorunludur')
    .min(3, 'Açıklama en az 3 karakter olmalıdır')
    .max(100, 'Açıklama en fazla 100 karakter olmalıdır'),
  amount: yup
    .number()
    .required('Tutar zorunludur')
    .positive('Tutar pozitif olmalıdır')
    .max(1000000, 'Tutar çok büyük'),
  category: yup
    .string()
    .required('Kategori seçiniz'),
  date: yup
    .string()
    .required('Tarih zorunludur'),
  type: yup
    .string()
    .oneOf(['Income', 'Expense'], 'Geçersiz tür')
    .required('Tür zorunludur')
});

type TransactionFormData = yup.InferType<typeof transactionSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
  onTransactionAdded: (transaction: Transaction) => void;
}

const AddTransactionDialog: React.FC<AddTransactionDialogProps> = ({
  open,
  onClose,
  onTransactionAdded
}) => {
  // Local state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form handling
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
    setValue
  } = useForm<TransactionFormData>({
    resolver: yupResolver(transactionSchema),
    mode: 'onChange',
    defaultValues: {
      description: '',
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0], // Today's date
      type: 'Expense' // Default to expense
    }
  });

  const watchedType = watch('type');
  const watchedAmount = watch('amount');

  // Get categories based on transaction type
  const getCategories = (type: string): string[] => {
    return type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  };

  // Form submission
  const onSubmit = async (data: TransactionFormData): Promise<void> => {
    const perfId = logger.performanceStart('add_transaction');
    
    try {
      setIsLoading(true);
      setError(null);
      
      logger.userAction('submit_add_transaction_form', 'AddTransactionDialog', {
        type: data.type,
        amount: data.amount,
        category: data.category
      });

      // Create transaction via API
      const newTransaction = await apiService.createTransaction(data);
      
      logger.performanceEnd(perfId, 'add_transaction');
      logger.info('Transaction added successfully', { 
        id: newTransaction.id, 
        type: newTransaction.type,
        amount: newTransaction.amount 
      }, 'AddTransactionDialog', 'TRANSACTION_ADDED');

      // Notify parent component
      onTransactionAdded(newTransaction);
      
      // Reset form and close dialog
      reset();
      onClose();
      
    } catch (error: any) {
      logger.performanceEnd(perfId, 'add_transaction');
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.title ||
                          error.message || 
                          'İşlem eklenirken bir hata oluştu';
      
      logger.error('Failed to add transaction', {
        error: errorMessage,
        status: error.response?.status,
        data: data
      }, 'AddTransactionDialog', 'ADD_TRANSACTION_ERROR');
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers
  const handleClose = (): void => {
    if (!isLoading) {
      logger.userAction('close_add_transaction_dialog', 'AddTransactionDialog');
      reset();
      setError(null);
      onClose();
    }
  };

  const handleTypeChange = (isIncome: boolean): void => {
    const newType = isIncome ? 'Income' : 'Expense';
    logger.userAction('change_transaction_type', 'AddTransactionDialog', { type: newType });
    setValue('type', newType);
    setValue('category', ''); // Reset category when type changes
  };

  const handleDismissError = (): void => {
    logger.userAction('dismiss_error', 'AddTransactionDialog');
    setError(null);
  };

  // Format currency for display
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={isLoading}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {watchedType === 'Income' ? (
            <TrendingUp sx={{ color: 'success.main' }} />
          ) : (
            <TrendingDown sx={{ color: 'error.main' }} />
          )}
          <Typography variant="h6">
            {watchedType === 'Income' ? 'Gelir Ekle' : 'Gider Ekle'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={handleDismissError}
          >
            {error}
          </Alert>
        )}

        <Box component="form" sx={{ mt: 1 }}>
          {/* Transaction Type Switch */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={watchedType === 'Income'}
                  onChange={(e) => handleTypeChange(e.target.checked)}
                  disabled={isLoading}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={watchedType === 'Income' ? 'Gelir' : 'Gider'}
                    color={watchedType === 'Income' ? 'success' : 'error'}
                    size="small"
                  />
                  <Typography variant="body2">
                    {watchedType === 'Income' ? 'Gelir olarak işaretle' : 'Gider olarak işaretle'}
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Description Field */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Açıklama"
                margin="normal"
                error={!!errors.description}
                helperText={errors.description?.message}
                disabled={isLoading}
                placeholder="örn: Market alışverişi, Maaş ödemesi..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description color={errors.description ? 'error' : 'action'} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Amount Field */}
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Tutar"
                type="number"
                margin="normal"
                error={!!errors.amount}
                helperText={errors.amount?.message || (watchedAmount > 0 ? `Görünüm: ${formatCurrency(watchedAmount)}` : '')}
                disabled={isLoading}
                inputProps={{ min: 0, step: 0.01 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney color={errors.amount ? 'error' : 'action'} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Category Field */}
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth margin="normal" error={!!errors.category}>
                <InputLabel>Kategori</InputLabel>
                <Select
                  {...field}
                  label="Kategori"
                  disabled={isLoading}
                  startAdornment={
                    <InputAdornment position="start">
                      <Category color={errors.category ? 'error' : 'action'} />
                    </InputAdornment>
                  }
                >
                  {getCategories(watchedType).map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {errors.category.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          {/* Date Field */}
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Tarih"
                type="date"
                margin="normal"
                error={!!errors.date}
                helperText={errors.date?.message}
                disabled={isLoading}
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DateRange color={errors.date ? 'error' : 'action'} />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Preview */}
          {watchedAmount > 0 && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: watchedType === 'Income' ? 'success.light' : 'error.light',
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Önizleme:
              </Typography>
              <Typography 
                variant="h6" 
                fontWeight="bold"
                sx={{ color: watchedType === 'Income' ? 'success.dark' : 'error.dark' }}
              >
                {watchedType === 'Income' ? '+' : '-'}{formatCurrency(watchedAmount)}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={isLoading}
          color="inherit"
        >
          İptal
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isLoading || !isValid}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Ekleniyor...' : 'Ekle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddTransactionDialog;