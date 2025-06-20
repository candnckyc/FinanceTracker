// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Fab
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Add as AddIcon
} from '@mui/icons-material';

// Contexts & Services
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

// Components
import AddTransactionDialog from '../components/AddTransactionDialog';

// Types
import { Transaction, DashboardStats } from '../types';

// Utils
import logger from '../utils/logger';

interface DashboardPageProps {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  // Component lifecycle
  useEffect(() => {
    logger.componentMount('DashboardPage');
    logger.info('User accessed dashboard', undefined, 'DashboardPage', 'PAGE_LOAD');
    
    return () => {
      logger.componentUnmount('DashboardPage');
    };
  }, []);

  // Auth context
  const { user, logout } = useAuth();

  // Local state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);

  // Menu state
  const isMenuOpen = Boolean(anchorEl);

  // Load dashboard data
  const loadDashboardData = async (): Promise<void> => {
    const perfId = logger.performanceStart('load_dashboard_data');
    
    try {
      setIsLoading(true);
      setError(null);

      logger.info('Loading dashboard data', undefined, 'DashboardPage', 'DATA_LOAD_START');

      // Load transactions and stats in parallel
      const [transactionsData, statsData] = await Promise.all([
        apiService.getTransactions(),
        apiService.getDashboardStats()
      ]);

      setTransactions(transactionsData);
      setStats(statsData);

      logger.performanceEnd(perfId, 'load_dashboard_data');
      logger.info('Dashboard data loaded successfully', {
        transactionCount: transactionsData.length,
        balance: statsData.balance
      }, 'DashboardPage', 'DATA_LOAD_SUCCESS');

    } catch (error: any) {
      logger.performanceEnd(perfId, 'load_dashboard_data');
      logger.error('Failed to load dashboard data', error, 'DashboardPage', 'DATA_LOAD_ERROR');
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Veriler yüklenirken bir hata oluştu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Event handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    logger.userAction('open_profile_menu', 'DashboardPage');
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    logger.userAction('close_profile_menu', 'DashboardPage');
    setAnchorEl(null);
  };

  const handleLogout = (): void => {
    logger.userAction('logout', 'DashboardPage');
    logger.info('User logging out', { userId: user?.id }, 'DashboardPage', 'LOGOUT');
    handleMenuClose();
    logout();
  };

  const handleAddTransaction = (): void => {
    logger.userAction('open_add_transaction_dialog', 'DashboardPage');
    setAddDialogOpen(true);
  };

  const handleTransactionAdded = (newTransaction: Transaction): void => {
    logger.info('Transaction added successfully', { 
      id: newTransaction.id, 
      type: newTransaction.type, 
      amount: newTransaction.amount 
    }, 'DashboardPage', 'TRANSACTION_ADDED');
    
    // Refresh dashboard data
    loadDashboardData();
    setAddDialogOpen(false);
  };

  const handleTransactionUpdated = (): void => {
    logger.info('Transaction updated, refreshing data', undefined, 'DashboardPage', 'TRANSACTION_UPDATED');
    loadDashboardData();
  };

  const handleTransactionDeleted = (): void => {
    logger.info('Transaction deleted, refreshing data', undefined, 'DashboardPage', 'TRANSACTION_DELETED');
    loadDashboardData();
  };

  const handleRetry = (): void => {
    logger.userAction('retry_load_data', 'DashboardPage');
    loadDashboardData();
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  // Get balance color
  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return 'success.main';
    if (balance < 0) return 'error.main';
    return 'text.primary';
  };

  // Render loading state
  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Finance Tracker
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'}
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
            />
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="profile-menu"
              aria-haspopup="true"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Çıkış Yap
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <button onClick={handleRetry}>
                Tekrar Dene
              </button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(4, 1fr)' 
            }, 
            gap: 3, 
            mb: 4 
          }}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <AccountBalance sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Toplam Bakiye
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight="bold"
                sx={{ color: 'white' }}
              >
                {formatCurrency(stats.balance)}
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white'
              }}
            >
              <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Toplam Gelir
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(stats.totalIncome)}
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white'
              }}
            >
              <TrendingDown sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                Toplam Gider
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {formatCurrency(stats.totalExpenses)}
              </Typography>
            </Paper>

            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                color: 'white'
              }}
            >
              <Receipt sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" gutterBottom>
                İşlem Sayısı
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {stats.transactionCount}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Recent Transactions */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">
              Son İşlemler
            </Typography>
          </Box>

          {transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Henüz işlem bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                İlk işleminizi eklemek için + butonuna tıklayın
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {transactions.map((transaction) => (
                <Box
                  key={transaction.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' }
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {transaction.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {transaction.category} • {new Date(transaction.date).toLocaleDateString('tr-TR')}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{
                      color: transaction.type === 'Income' ? 'success.main' : 'error.main'
                    }}
                  >
                    {transaction.type === 'Income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add transaction"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={handleAddTransaction}
      >
        <AddIcon />
      </Fab>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onTransactionAdded={handleTransactionAdded}
      />
    </Box>
  );
};

export default DashboardPage;