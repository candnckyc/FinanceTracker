import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Chip,
  Card,
  CardContent,
  Stack,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Preview as PreviewIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import logger from '../utils/logger';
import EmailPreviewModal from '../components/EmailPreviewModal';
import { Transaction } from '../types';

interface EmailSettings {
  enabled: boolean;
  frequency: 'weekly' | 'monthly' | 'biweekly' | 'quarterly';
  nextReportDate: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: true,
    frequency: 'monthly',
    nextReportDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadEmailSettings();
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const transactionsData = await apiService.getTransactions();
      setTransactions(transactionsData);
    } catch (err) {
      logger.error('Failed to load transactions for email preview', err, 'SettingsPage', 'LOAD_TRANSACTIONS_ERROR');
    }
  };

  const loadEmailSettings = async () => {
    try {
      // In a real app, you'd fetch from API
      // For now, we'll use localStorage as mock data
      const savedSettings = localStorage.getItem('emailSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Set default next report date
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        setSettings(prev => ({
          ...prev,
          nextReportDate: nextMonth.toLocaleDateString()
        }));
      }
      logger.info('Email settings loaded', undefined, 'SettingsPage', 'LOAD_SETTINGS');
    } catch (err) {
      logger.error('Failed to load email settings', err, 'SettingsPage', 'LOAD_ERROR');
    }
  };

  const calculateNextReportDate = (frequency: string): string => {
    const now = new Date();
    let nextDate = new Date();

    switch (frequency) {
      case 'weekly':
        // Next Monday
        const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
        nextDate.setDate(now.getDate() + daysUntilMonday);
        break;
      case 'biweekly':
        // Next Monday, 2 weeks from now
        const daysUntilBiweekly = (7 - now.getDay() + 1) % 7 || 7;
        nextDate.setDate(now.getDate() + daysUntilBiweekly + 14);
        break;
      case 'monthly':
        // First day of next month
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(1);
        break;
      case 'quarterly':
        // First day of next quarter
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const nextQuarter = (currentQuarter + 1) % 4;
        const nextQuarterYear = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
        nextDate = new Date(nextQuarterYear, nextQuarter * 3, 1);
        break;
      default:
        nextDate = now;
    }

    return nextDate.toLocaleDateString();
  };

  const handleFrequencyChange = (frequency: 'weekly' | 'monthly' | 'biweekly' | 'quarterly') => {
    const nextReportDate = calculateNextReportDate(frequency);
    setSettings(prev => ({
      ...prev,
      frequency,
      nextReportDate
    }));
    logger.userAction('change_email_frequency', 'SettingsPage', { frequency });
  };

  const handleToggleEnabled = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
    logger.userAction('toggle_email_reports', 'SettingsPage', { enabled });
  };

  const saveSettings = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // In a real app, you'd send to your API
      // await apiService.updateEmailSettings(settings);
      
      // For now, save to localStorage
      localStorage.setItem('emailSettings', JSON.stringify(settings));
      
      setSuccess('Email report settings saved successfully!');
      logger.info('Email settings saved', settings, 'SettingsPage', 'SAVE_SUCCESS');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      logger.error('Failed to save email settings', err, 'SettingsPage', 'SAVE_ERROR');
    } finally {
      setLoading(false);
    }
  };

  const showEmailPreview = () => {
    setPreviewOpen(true);
    logger.userAction('show_email_preview', 'SettingsPage', { frequency: settings.frequency });
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <AppBar position="static" sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white' }}>
            Email Report Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
        {/* Success/Error Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Main Settings Card */}
        <Paper sx={{ p: 4, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
          <Box display="flex" alignItems="center" mb={3}>
            <EmailIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Email Reports
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Get automated financial summaries delivered to {user?.email}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Enable/Disable Toggle */}
          <Box mb={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="h6">
                    Enable Email Reports
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Receive automated financial summaries via email
                  </Typography>
                </Box>
              }
            />
          </Box>

          {/* Frequency Settings */}
          {settings.enabled && (
            <>
              <Box mb={4}>
                <FormControl fullWidth>
                  <InputLabel>Report Frequency</InputLabel>
                  <Select
                    value={settings.frequency}
                    label="Report Frequency"
                    onChange={(e) => handleFrequencyChange(e.target.value as any)}
                  >
                    <MenuItem value="weekly">
                      <Box>
                        <Typography>Weekly</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Every Monday morning
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="biweekly">
                      <Box>
                        <Typography>Bi-weekly</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Every other Monday
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="monthly">
                      <Box>
                        <Typography>Monthly (Recommended)</Typography>
                        <Typography variant="caption" color="text.secondary">
                          First day of each month
                        </Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="quarterly">
                      <Box>
                        <Typography>Quarterly</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Every 3 months
                        </Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Next Report Info */}
              <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon sx={{ mr: 2 }} />
                    <Box>
                      <Typography variant="h6">
                        Next Report: {settings.nextReportDate}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Your {settings.frequency} report will be sent automatically
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              onClick={saveSettings}
              loading={loading}
              disabled={loading}
              sx={{ background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)' }}
            >
              Save Settings
            </Button>

            {settings.enabled && (
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={showEmailPreview}
                sx={{ textTransform: 'none' }}
              >
                Preview Email Report
              </Button>
            )}
          </Stack>

          <Divider sx={{ my: 4 }} />

          {/* What's Included Section */}
          <Box>
            <Typography variant="h6" gutterBottom>
              📧 What's Included in Your Reports
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
              {[
                '💰 Balance Summary',
                '📊 Spending by Category',
                '📈 Income vs Expenses',
                '🎯 Monthly Trends',
                '🏆 Top Transactions',
                '💡 Financial Insights'
              ].map((feature) => (
                <Chip
                  key={feature}
                  label={feature}
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: 'rgba(102, 126, 234, 0.1)' }}
                />
              ))}
            </Box>
          </Box>
        </Paper>

        {/* Email Preview Modal */}
        <EmailPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          transactions={transactions}
          userEmail={user?.email || 'user@example.com'}
          frequency={settings.frequency}
        />
      </Container>
    </Box>
  );
};

export default SettingsPage;