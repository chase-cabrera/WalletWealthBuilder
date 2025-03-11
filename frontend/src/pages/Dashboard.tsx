import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Skeleton,
  Button,
  useTheme,
  Avatar,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  AccountBalance as AccountIcon, 
  TrendingUp as TrendingUpIcon,
  Flag as GoalIcon,
  PieChart as BudgetIcon,
  ArrowUpward as IncreaseIcon,
  ArrowDownward as DecreaseIcon
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import accountService, { Account } from '../services/accountService';
import transactionService, { Transaction } from '../services/transactionService';
import budgetService, { Budget } from '../services/budgetService';
import goalService, { Goal } from '../services/goalService';
import { format, parseISO, subDays, startOfMonth, endOfMonth } from 'date-fns';
import AccountBalanceChart from '../components/dashboard/AccountBalanceChart';
import TransactionSummary from '../components/dashboard/TransactionSummary';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import SpendingByCategoryChart from '../components/dashboard/SpendingByCategoryChart';
import IncomeVsExpenseChart from '../components/dashboard/IncomeVsExpenseChart';
import NetWorthChart from '../components/dashboard/NetWorthChart';

// Sample account data for when no real accounts exist
const SAMPLE_ACCOUNTS: Account[] = [
  { 
    id: 1, 
    name: 'Checking', 
    type: 'CHECKING', 
    balance: 2500, 
    institution: 'Sample Bank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 2, 
    name: 'Savings', 
    type: 'SAVINGS', 
    balance: 10000, 
    institution: 'Sample Bank',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 3, 
    name: 'Credit Card', 
    type: 'CREDIT_CARD', 
    balance: -1500, 
    institution: 'Sample Credit',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  { 
    id: 4, 
    name: 'Investment', 
    type: 'INVESTMENT', 
    balance: 15000, 
    institution: 'Sample Invest',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const Dashboard: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [netWorth, setNetWorth] = useState(0);
  const [netWorthChange, setNetWorthChange] = useState(0);
  const [hasRealData, setHasRealData] = useState(false);
  const dataFetchedRef = useRef(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // Create stable sample transactions data
  const sampleTransactions: Transaction[] = useMemo(() => [
    { 
      id: 1, 
      description: 'Grocery Shopping', 
      amount: -120.50, 
      date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), 
      type: 'EXPENSE', 
      category: 'Groceries',
      vendor: 'Supermarket',
      purchaser: 'Me',
      note: '',
      createdAt: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
      updatedAt: format(subDays(new Date(), 2), 'yyyy-MM-dd')
    },
    { 
      id: 2, 
      description: 'Salary Deposit', 
      amount: 3000, 
      date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), 
      type: 'INCOME', 
      category: 'Salary',
      vendor: 'Employer',
      purchaser: 'Me',
      note: '',
      createdAt: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      updatedAt: format(subDays(new Date(), 5), 'yyyy-MM-dd')
    },
    { 
      id: 3, 
      description: 'Restaurant Dinner', 
      amount: -85.20, 
      date: format(subDays(new Date(), 3), 'yyyy-MM-dd'), 
      type: 'EXPENSE', 
      category: 'Dining',
      vendor: 'Restaurant',
      purchaser: 'Me',
      note: '',
      createdAt: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
      updatedAt: format(subDays(new Date(), 3), 'yyyy-MM-dd')
    },
    { 
      id: 4, 
      description: 'Gas Station', 
      amount: -45.00, 
      date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), 
      type: 'EXPENSE', 
      category: 'Transportation',
      vendor: 'Gas Station',
      purchaser: 'Me',
      note: '',
      createdAt: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      updatedAt: format(subDays(new Date(), 1), 'yyyy-MM-dd')
    },
    { 
      id: 5, 
      description: 'Freelance Work', 
      amount: 500, 
      date: format(subDays(new Date(), 4), 'yyyy-MM-dd'), 
      type: 'INCOME', 
      category: 'Freelance',
      vendor: 'Client',
      purchaser: 'Me',
      note: '',
      createdAt: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
      updatedAt: format(subDays(new Date(), 4), 'yyyy-MM-dd')
    }
  ], []);

  // Memoize accounts to prevent unnecessary re-renders
  const displayAccounts = useMemo(() => {
    return hasRealData ? accounts : SAMPLE_ACCOUNTS;
  }, [hasRealData, accounts]);

  // Memoize transactions to prevent unnecessary re-renders
  const displayTransactions = useMemo(() => {
    console.log("Calculating displayTransactions. hasRealData:", hasRealData, "transactions.length:", transactions.length);
    return hasRealData ? transactions : sampleTransactions;
  }, [hasRealData, transactions, sampleTransactions]);
  
  // Memoize recent transactions to prevent unnecessary re-renders
  const displayRecentTransactions = useMemo(() => {
    console.log("Calculating displayRecentTransactions. hasRealData:", hasRealData, "recentTransactions.length:", recentTransactions.length);
    return hasRealData ? recentTransactions : sampleTransactions;
  }, [hasRealData, recentTransactions, sampleTransactions]);

  // Fetch data only once
  useEffect(() => {
    // Only fetch data once using ref to prevent multiple fetches
    if (dataFetchedRef.current) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch accounts
        const accountsData = await accountService.getAll();
        console.log("Dashboard fetched accounts:", accountsData);
        setAccounts(accountsData);
        
        // Check if we have real account data
        const hasAccounts = accountsData && accountsData.length > 0;
        console.log("Dashboard hasAccounts:", hasAccounts);
        setHasRealData(hasAccounts);
        
        // Only calculate net worth if we have real accounts
        if (hasAccounts) {
          // Calculate net worth from real accounts
          const totalBalance = accountsData.reduce((sum, account) => sum + account.balance, 0);
          setNetWorth(totalBalance);
          
          // For demo purposes, set a random change
          const randomChange = (Math.random() * 2 - 1) * 500;
          setNetWorthChange(randomChange);
        } else {
          // Use sample data for net worth if no accounts
          setNetWorth(26000); // Sample net worth value
          setNetWorthChange(1200); // Sample change value
        }
        
        // Fetch transactions for the current month - only if we have accounts
        if (hasAccounts) {
          const now = new Date();
          const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
          
          const transactionsData = await transactionService.getAll({
            startDate,
            endDate,
            pageSize: 1000 // Increase page size to get more transactions
          });
          console.log("Dashboard fetched transactions:", transactionsData.data);
          setTransactions(transactionsData.data);
          
          // Fetch recent transactions
          const recentData = await transactionService.getAll({ 
            pageSize: 5,
            sortBy: 'date',
            sortOrder: 'DESC'
          });
          console.log("Dashboard fetched recent transactions:", recentData.data);
          setRecentTransactions(recentData.data);
        } else {
          // Use empty arrays for transactions if no accounts
          setTransactions([]);
          setRecentTransactions([]);
        }
        
        // Fetch budgets - only if we have accounts
        if (hasAccounts) {
          const budgetsData = await budgetService.getAll();
          setBudgets(budgetsData);
        } else {
          setBudgets([]);
        }
        
        // Fetch goals - only if we have accounts
        if (hasAccounts) {
          const goalsData = await goalService.getAll();
          setGoals(goalsData);
        } else {
          setGoals([]);
        }
        
        // Mark data as fetched using ref to ensure it's only fetched once
        dataFetchedRef.current = true;
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setHasRealData(false);
        dataFetchedRef.current = true;
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Cleanup function
    return () => {
      // This ensures we don't try to update state after unmount
    };
  }, []); // Empty dependency array to run only once

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Welcome to Wallet Wealth Builder
        </Typography>
        <Box>
          <Button 
            component={Link} 
            to="/transactions" 
            variant="outlined" 
            color="primary"
            sx={{ mr: 2 }}
          >
            View All Transactions
          </Button>
          <Button 
            component={Link} 
            to="/accounts" 
            variant="contained" 
            color="primary"
            disableElevation
          >
            Manage Accounts
          </Button>
        </Box>
      </Box>
      
      {!hasRealData && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3, 
            bgcolor: 'info.lighter', 
            color: 'info.dark',
            border: '1px solid',
            borderColor: 'info.light',
            borderRadius: 2
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            You're viewing sample data. Add accounts to see your actual financial information.
          </Typography>
        </Paper>
      )}
      
      <Grid container spacing={3}>
        {/* Net Worth Over Time - Moved to the top */}
        <Grid item xs={12}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              height: 450
            }}
          >
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Net Worth Over Time
            </Typography>
            <Box sx={{ height: 400 }}>
              <NetWorthChart accounts={displayAccounts} months={12} height="100%" />
            </Box>
          </Paper>
        </Grid>
        
        {/* Account Balance Chart */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              height: '100%', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Account Balances
            </Typography>
            <Box sx={{ flexGrow: 1, minHeight: 300 }}>
              <AccountBalanceChart accounts={displayAccounts} />
            </Box>
          </Paper>
        </Grid>
        
        {/* Transaction Summary */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              height: '100%', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              This Month's Summary
            </Typography>
            <Box sx={{ flexGrow: 1 }}>
              <TransactionSummary transactions={displayTransactions} />
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Transactions */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}
          >
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Recent Transactions
            </Typography>
            <Box sx={{ flexGrow: 1 }}>
              <RecentTransactions 
                transactions={displayRecentTransactions} 
                accounts={displayAccounts.reduce((acc, account) => {
                  acc[account.id] = account.name;
                  return acc;
                }, {} as Record<number, string>)}
              />
            </Box>
          </Paper>
        </Grid>
        
        {/* Spending by Category */}
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 450
            }}
          >
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Spending by Category
            </Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <SpendingByCategoryChart transactions={[]} />
            </Box>
          </Paper>
        </Grid>
        
        {/* Income vs Expense */}
        <Grid item xs={12}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              height: 400
            }}
          >
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Income vs Expenses
            </Typography>
            <Box sx={{ height: 350 }}>
              <IncomeVsExpenseChart transactions={displayTransactions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 