import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  AppBar,
  Toolbar,
  Button,
  Chip,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Stack,
  Collapse,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as BalanceIcon,
  Receipt as ReceiptIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Transaction, TransactionCreateDto } from '../types';
import logger from '../utils/logger';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
}

const categories = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Business',
  'Investment',
  'Salary',
  'Freelance',
  'Gift',
  'Other'
];

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0
  });
  
  // Dialog states
  const [open, setOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [formData, setFormData] = useState<TransactionCreateDto>({
    description: '',
    amount: 0,
    type: 'Expense',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const perfId = logger.performanceStart('load_dashboard_data');
    try {
      logger.info('Loading dashboard data', undefined, 'DashboardPage', 'DATA_LOAD_START');
      setLoading(true);
      setError(null);

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
    } catch (err: any) {
      logger.performanceEnd(perfId, 'load_dashboard_data');
      logger.error('Failed to load dashboard data', err, 'DashboardPage', 'DATA_LOAD_ERROR');
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.category.toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (filterType !== 'All') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [transactions, searchText, filterType, filterCategory]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      transactionCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const handleLogout = () => {
    logger.userAction('logout_button_click', 'DashboardPage');
    logout();
  };

  const handleAddTransaction = () => {
    logger.userAction('add_transaction_button_click', 'DashboardPage');
    setEditingTransaction(null);
    setFormData({
      description: '',
      amount: 0,
      type: 'Expense',
      category: '',
      date: new Date().toISOString().split('T')[0]
    });
    setOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    logger.userAction('edit_transaction_button_click', 'DashboardPage', { transactionId: transaction.id });
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date
    });
    setOpen(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      logger.userAction('delete_transaction_confirm', 'DashboardPage', { transactionId: id });
      await apiService.deleteTransaction(id);
      logger.info('Transaction deleted successfully', { transactionId: id }, 'DashboardPage', 'DELETE_SUCCESS');
      await loadDashboardData();
    } catch (err: any) {
      logger.error('Failed to delete transaction', { transactionId: id, error: err }, 'DashboardPage', 'DELETE_ERROR');
      setError('Failed to delete transaction. Please try again.');
    }
  };

  const handleSubmit = async () => {
    const perfId = logger.performanceStart('submit_transaction');
    try {
      logger.userAction('submit_transaction_form', 'DashboardPage', { 
        type: formData.type, 
        amount: formData.amount,
        isEdit: !!editingTransaction 
      });

      if (editingTransaction) {
        await apiService.updateTransaction(editingTransaction.id, formData);
        logger.info('Transaction updated successfully', { transactionId: editingTransaction.id }, 'DashboardPage', 'UPDATE_SUCCESS');
      } else {
        await apiService.createTransaction(formData);
        logger.info('Transaction created successfully', { type: formData.type, amount: formData.amount }, 'DashboardPage', 'CREATE_SUCCESS');
      }

      logger.performanceEnd(perfId, 'submit_transaction');
      setOpen(false);
      await loadDashboardData();
    } catch (err: any) {
      logger.performanceEnd(perfId, 'submit_transaction');
      logger.error('Failed to submit transaction', { formData, error: err }, 'DashboardPage', 'SUBMIT_ERROR');
      setError('Failed to save transaction. Please try again.');
    }
  };

  const clearFilters = () => {
    logger.userAction('clear_filters_click', 'DashboardPage');
    setSearchText('');
    setFilterType('All');
    setFilterCategory('');
  };

  const hasActiveFilters = searchText || filterType !== 'All' || filterCategory;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
            Finance Tracker
          </Typography>
          <Chip
            label={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'User'}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white', mr: 2 }}
          />
          <Avatar sx={{ width: 32, height: 32, mr: 2 }}>
            {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
          </Avatar>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
        {error && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Typography>{error}</Typography>
            <Button onClick={() => setError(null)} sx={{ mt: 1, color: 'inherit' }}>
              Dismiss
            </Button>
          </Paper>
        )}

        {/* Stats Cards - Using Flexbox instead of Grid */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="inherit" gutterBottom>Total Balance</Typography>
                    <Typography variant="h4" component="div">
                      ${(filteredStats.balance).toFixed(2)}
                    </Typography>
                  </Box>
                  <BalanceIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="inherit" gutterBottom>Total Income</Typography>
                    <Typography variant="h4" component="div">
                      ${filteredStats.totalIncome.toFixed(2)}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="inherit" gutterBottom>Total Expenses</Typography>
                    <Typography variant="h4" component="div">
                      ${filteredStats.totalExpenses.toFixed(2)}
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <Card sx={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#333' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="inherit" gutterBottom>Transactions</Typography>
                    <Typography variant="h4" component="div">
                      {filteredStats.transactionCount}
                    </Typography>
                  </Box>
                  <ReceiptIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Transactions Section */}
        <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
          {/* Header with Add Transaction and Filters */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h2">
              Recent Transactions
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                color={hasActiveFilters ? "secondary" : "primary"}
              >
                Filters {hasActiveFilters && `(Active)`}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddTransaction}
                sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
              >
                Add Transaction
              </Button>
            </Stack>
          </Box>

          {/* Filters Section */}
          <Collapse in={showFilters}>
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
              {/* Using Flexbox for filters instead of Grid */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 3 }}>
                {/* Search */}
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <TextField
                    fullWidth
                    label="Search"
                    placeholder="Description or category..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* Type Filter */}
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filterType}
                      label="Type"
                      onChange={(e) => setFilterType(e.target.value as any)}
                    >
                      <MenuItem value="All">All Types</MenuItem>
                      <MenuItem value="Income">Income</MenuItem>
                      <MenuItem value="Expense">Expense</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Category Filter */}
                <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={filterCategory}
                      label="Category"
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Clear Filters */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear All Filters
                </Button>
              </Box>
            </Paper>
          </Collapse>

          {/* Results Summary */}
          {hasActiveFilters && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
              <Typography variant="body2">
                Showing {filteredTransactions.length} of {transactions.length} transactions
                {filteredStats.transactionCount !== stats.transactionCount && (
                  <> • Filtered Balance: ${filteredStats.balance.toFixed(2)}</>
                )}
              </Typography>
            </Paper>
          )}

          {/* Transactions Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Description</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>Amount</strong></TableCell>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet. Add your first transaction!'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <Chip label={transaction.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.type}
                          size="small"
                          color={transaction.type === 'Income' ? 'success' : 'error'}
                          icon={transaction.type === 'Income' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            color: transaction.type === 'Income' ? 'success.main' : 'error.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {transaction.type === 'Income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditTransaction(transaction)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      {/* Add/Edit Transaction Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Grocery shopping, Salary, etc."
            />

            <Box>
              <Typography variant="subtitle2" gutterBottom>Transaction Type</Typography>
              <ToggleButtonGroup
                value={formData.type}
                exclusive
                onChange={(e, value) => value && setFormData(prev => ({ ...prev, type: value }))}
                fullWidth
              >
                <ToggleButton value="Income" color="success">
                  <TrendingUpIcon sx={{ mr: 1 }} />
                  Income
                </ToggleButton>
                <ToggleButton value="Expense" color="error">
                  <TrendingDownIcon sx={{ mr: 1 }} />
                  Expense
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.description || !formData.amount || !formData.category}
          >
            {editingTransaction ? 'Update' : 'Add'} Transaction
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardPage;