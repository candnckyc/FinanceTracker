import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { Transaction } from '../types';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  userEmail: string;
  frequency: 'weekly' | 'monthly' | 'biweekly' | 'quarterly';
}

interface EmailData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  topCategories: Array<{ name: string; amount: number; percentage: number }>;
  biggestExpense: Transaction | null;
  biggestIncome: Transaction | null;
  periodName: string;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  open,
  onClose,
  transactions,
  userEmail,
  frequency
}) => {

  // Calculate email data
  const emailData = useMemo((): EmailData => {
    // Filter transactions for the period (last month for example)
    const now = new Date();
    const periodStart = new Date();
    
    switch (frequency) {
      case 'weekly':
        periodStart.setDate(now.getDate() - 7);
        break;
      case 'biweekly':
        periodStart.setDate(now.getDate() - 14);
        break;
      case 'monthly':
        periodStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarterly':
        periodStart.setMonth(now.getMonth() - 3);
        break;
    }

    const periodTransactions = transactions.filter(t => 
      new Date(t.date) >= periodStart && new Date(t.date) <= now
    );

    const income = periodTransactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = periodTransactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Top spending categories
    const categoryTotals = periodTransactions
      .filter(t => t.type === 'Expense')
      .reduce((acc: Record<string, number>, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});

    const topCategories = Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: expenses > 0 ? (amount / expenses) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    // Biggest transactions
    const expenseTransactions = periodTransactions.filter(t => t.type === 'Expense');
    const incomeTransactions = periodTransactions.filter(t => t.type === 'Income');
    
    const biggestExpense = expenseTransactions.length > 0 
      ? expenseTransactions.reduce((max, t) => t.amount > max.amount ? t : max)
      : null;
    
    const biggestIncome = incomeTransactions.length > 0
      ? incomeTransactions.reduce((max, t) => t.amount > max.amount ? t : max)
      : null;

    const periodName = frequency === 'weekly' ? 'This Week' :
                      frequency === 'biweekly' ? 'Last 2 Weeks' :
                      frequency === 'monthly' ? 'This Month' :
                      'This Quarter';

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      transactionCount: periodTransactions.length,
      topCategories,
      biggestExpense,
      biggestIncome,
      periodName
    };
  }, [transactions, frequency]);

  // Generate HTML email template
  const generateEmailHTML = (): string => {
    const { totalIncome, totalExpenses, balance, transactionCount, topCategories, biggestExpense, biggestIncome, periodName } = emailData;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Finance Report</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            text-align: center; 
            padding: 30px 20px;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 300;
        }
        .content { 
            padding: 30px; 
        }
        .stat-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 15px 0; 
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .stat-label { 
            font-weight: 600; 
            color: #666;
        }
        .stat-value { 
            font-weight: bold; 
            font-size: 18px;
        }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        .section { 
            margin: 25px 0; 
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .section h3 { 
            margin-top: 0; 
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
        }
        .category-item { 
            display: flex; 
            justify-content: space-between; 
            margin: 8px 0; 
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .category-bar {
            width: 100%;
            height: 6px;
            background: #eee;
            border-radius: 3px;
            margin: 5px 0;
        }
        .category-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 3px;
        }
        .transaction-highlight {
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
        }
        .footer { 
            text-align: center; 
            padding: 20px; 
            background: #f8f9fa; 
            color: #666; 
            font-size: 14px;
        }
        .emoji { font-size: 20px; margin-right: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Your ${periodName} Finance Report</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Here's how your finances looked ${frequency === 'monthly' ? 'this month' : 'this period'}</p>
        </div>
        
        <div class="content">
            <!-- Summary Stats -->
            <div class="section">
                <h3>💰 Financial Summary</h3>
                
                <div class="stat-row">
                    <span class="stat-label">Total Income</span>
                    <span class="stat-value positive">+$${totalIncome.toFixed(2)}</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Total Expenses</span>
                    <span class="stat-value negative">-$${totalExpenses.toFixed(2)}</span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Net Balance</span>
                    <span class="stat-value ${balance >= 0 ? 'positive' : 'negative'}">
                        ${balance >= 0 ? '+' : ''}$${balance.toFixed(2)}
                    </span>
                </div>
                
                <div class="stat-row">
                    <span class="stat-label">Total Transactions</span>
                    <span class="stat-value">${transactionCount}</span>
                </div>
            </div>

            ${topCategories.length > 0 ? `
            <!-- Top Categories -->
            <div class="section">
                <h3>🏷️ Top Spending Categories</h3>
                ${topCategories.map(cat => `
                    <div class="category-item">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>${cat.name}</span>
                                <span><strong>$${cat.amount.toFixed(2)}</strong></span>
                            </div>
                            <div class="category-bar">
                                <div class="category-fill" style="width: ${cat.percentage}%"></div>
                            </div>
                            <small style="color: #666;">${cat.percentage.toFixed(1)}% of total expenses</small>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            ${biggestExpense || biggestIncome ? `
            <!-- Notable Transactions -->
            <div class="section">
                <h3>🎯 Notable Transactions</h3>
                
                ${biggestIncome ? `
                <div class="transaction-highlight">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #28a745;">💰 Biggest Income</strong>
                            <div>${biggestIncome.description}</div>
                            <small style="color: #666;">${biggestIncome.category} • ${new Date(biggestIncome.date).toLocaleDateString()}</small>
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: #28a745;">
                            +$${biggestIncome.amount.toFixed(2)}
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${biggestExpense ? `
                <div class="transaction-highlight">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: #dc3545;">💸 Biggest Expense</strong>
                            <div>${biggestExpense.description}</div>
                            <small style="color: #666;">${biggestExpense.category} • ${new Date(biggestExpense.date).toLocaleDateString()}</small>
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: #dc3545;">
                            -$${biggestExpense.amount.toFixed(2)}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Insights -->
            <div class="section">
                <h3>💡 Quick Insights</h3>
                <ul style="padding-left: 20px;">
                    <li>You ${balance >= 0 ? 'saved' : 'overspent by'} <strong>$${Math.abs(balance).toFixed(2)}</strong> this ${frequency === 'monthly' ? 'month' : 'period'}</li>
                    ${totalExpenses > 0 ? `<li>Your savings rate was <strong>${((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)}%</strong></li>` : ''}
                    <li>You made <strong>${transactionCount}</strong> transactions this ${frequency === 'monthly' ? 'month' : 'period'}</li>
                    ${topCategories.length > 0 ? `<li>Most spending was in <strong>${topCategories[0].name}</strong> (${topCategories[0].percentage.toFixed(1)}%)</li>` : ''}
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>📧 This is your automated ${frequency} finance report from Finance Tracker</p>
            <p style="margin: 5px 0;">Sent to: ${userEmail}</p>
            <p style="margin: 5px 0; font-size: 12px; color: #999;">
                Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
  };

  const copyToClipboard = async () => {
    try {
      const htmlContent = generateEmailHTML();
      await navigator.clipboard.writeText(htmlContent);
      // You could add a toast notification here that HTML was copied
    } catch (err) {
      console.error('Failed to copy HTML to clipboard:', err);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">
                Email Report Preview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)} report preview
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '100%' }}>
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          <iframe
            srcDoc={generateEmailHTML()}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Email Preview"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={copyToClipboard} 
          startIcon={<FileCopyIcon />}
          variant="outlined"
        >
          Copy HTML
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailPreviewModal;