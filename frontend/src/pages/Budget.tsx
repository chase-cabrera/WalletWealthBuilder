import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  LinearProgress, 
  Divider, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  CircularProgress,
  useTheme,
  Tooltip,
  Alert,
  Snackbar,
  Chip,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableFooter,
  TableRow,
  TableCell,
  Collapse
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ListAlt as ListAltIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import budgetService, { Budget as BudgetType } from '../services/budgetService';
import transactionService, { Transaction } from '../services/transactionService';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getCategoryDisplay } from '../utils/categoryUtils';
import { Category } from '../types/Category';
import { CategoryObject } from '../types/Transaction';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { CATEGORIES } from '../constants/categories';
import { useNavigate } from 'react-router-dom';

// Define colors for the pie chart
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#82CA9D', '#FF6B6B', '#6A7FDB', '#F7C59F', '#2E4057',
  '#F25F5C', '#247BA0', '#70C1B3'
];

interface BudgetFormData {
  id?: number;
  category: string;
  amount: number;
  description: string;
  startDate?: string;
  endDate?: string;
}

// Enhanced Budget type with additional fields needed for the component
interface EnhancedBudget extends BudgetType {
  id: number;
  amount: number;
  description?: string;
  category: string | Category;
  startDate: string;
  endDate: string;
  createdAt: string;
}

// Renamed to Budget to match the expected component name in routes
const Budget: React.FC = () => {
  const [budgets, setBudgets] = useState<EnhancedBudget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<BudgetFormData>({
    category: '',
    amount: 0,
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean, 
    message: string, 
    severity: 'success' | 'error' | 'info' | 'warning'
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const theme = useTheme();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const navigate = useNavigate();
  const [selectedBudgetTransactions, setSelectedBudgetTransactions] = useState<Transaction[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [expandedBudgets, setExpandedBudgets] = useState<Record<number, boolean>>({});
  const [budgetTransactions, setBudgetTransactions] = useState<Record<number, Transaction[]>>({});
  const [loadingBudgetTransactions, setLoadingBudgetTransactions] = useState<Record<number, boolean>>({});

  // First, let's extract the fetchData function from the useEffect to make it reusable
  const fetchData = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      console.log('Fetching data for period:', {
        startDate,
        endDate,
        selectedMonth: format(selectedMonth, 'yyyy-MM')
      });

      // Fetch budgets
      const budgetsData = await budgetService.getAll({
        startDate,
        endDate
      });
      console.log('Received budgets:', budgetsData);
      setBudgets(budgetsData as EnhancedBudget[]);
      
      // Fetch transactions with explicit date range
      const transactionsData = await transactionService.getAll({
        startDate,
        endDate,
        type: 'EXPENSE' // Only get expenses
      });
      
      // Filter and set transactions
      const expenseTransactions = transactionsData.data.filter(t => t.amount < 0);
      setTransactions(expenseTransactions);

    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error instanceof Error) {
        setError(`Failed to load budget data: ${error.message}`);
      } else {
        setError('Failed to load budget data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Then update the useEffect to use this function
  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // Calculate spending by category
  const calculateSpending = (budget: EnhancedBudget): number => {
    // Use the spent amount from the budget directly
    return Number(budget.spent) || 0;
  };

  // Calculate total budget
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  
  // Calculate total spending from budget spent amounts instead of transactions
  const totalSpending = budgets.reduce((sum, budget) => sum + Number(budget.spent || 0), 0);

  // Calculate percentage of budget used
  const calculatePercentage = (spent: number, budget: number): number => {
    if (budget <= 0) return 0;
    return Math.min(100, (spent / budget) * 100);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle dialog open for adding new budget
  const handleAddBudget = () => {
    setFormData({
      category: '',
      amount: 0,
      description: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  // Handle dialog open for editing budget
  const handleEditBudget = (budget: EnhancedBudget) => {
    const categoryName = typeof budget.category === 'string' 
      ? budget.category 
      : budget.category.name;

    console.log('Editing budget:', {
      original: budget,
      categoryName,
      formData: {
        id: budget.id,
        category: categoryName,
        amount: budget.amount,
        description: budget.description || '',
        startDate: budget.startDate,
        endDate: budget.endDate
      }
    });

    setFormData({
      id: budget.id,
      category: categoryName,
      amount: budget.amount,
      description: budget.description || '',
      startDate: budget.startDate,
      endDate: budget.endDate
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  // Handle select input changes
  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name as string]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      console.log('Submitting budget with dates:', { startDate, endDate });

      const budgetData = {
        ...formData,
        startDate,
        endDate
      };

      if (isEditing && formData.id) {
        await budgetService.update(formData.id, budgetData);
      } else {
        await budgetService.create(budgetData);
      }

      setOpenDialog(false);
      handleRefresh();
      
      setSnackbar({
        open: true,
        message: `Budget ${isEditing ? 'updated' : 'created'} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save budget:', error);
      setError('Failed to save budget. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle budget deletion
  const handleDeleteBudget = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await budgetService.delete(id);
        setBudgets(budgets.filter(b => b.id !== id));
      } catch (error) {
        console.error('Failed to delete budget:', error);
        setError('Failed to delete budget. Please try again.');
      }
    }
  };

  // Also update the refresh handler
  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      const budgetsData = await budgetService.getAll({
        startDate,
        endDate
      });
      
      // No need for deduplication as backend ensures unique budgets
      // Deduplicate budgets before setting state
      const uniqueBudgets = budgetsData as EnhancedBudget[];
      setBudgets(uniqueBudgets);
      
      const transactionsData = await transactionService.getAll({
        startDate,
        endDate
      });
      
      setTransactions(transactionsData.data.filter((t: Transaction) => t.amount < 0));
      setError(null);
    } catch (error) {
      console.error('Failed to refresh budget data:', error);
      setError('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for pie chart
  const preparePieChartData = () => {
    return budgets.map((budget, index) => {
      const categoryName = typeof budget.category === 'string' ? budget.category : budget.category.name;
      const spent = calculateSpending(budget);
      return {
        name: categoryName,
        value: budget.amount,
        spent,
        fill: COLORS[index % COLORS.length]
      };
    });
  };

  // Custom pie chart tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2, boxShadow: theme.shadows[3] }}>
          <Typography variant="subtitle2">{data.name}</Typography>
          <Typography variant="body2">Budget: {formatCurrency(data.value)}</Typography>
          <Typography variant="body2">Spent: {formatCurrency(data.spent)}</Typography>
          <Typography variant="body2">Remaining: {formatCurrency(data.remaining)}</Typography>
        </Paper>
      );
    }
    return null;
  };

  // Add this function to show snackbar messages
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Add this function to close the snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Add this function to fetch budgets
  const fetchBudgets = async () => {
    try {
      const budgetsData = await budgetService.getAll();
      setBudgets(budgetsData as EnhancedBudget[]);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
      setError('Failed to fetch budgets. Please try again.');
    }
  };

  // Add a function to identify auto-created budgets
  const isAutoCreatedBudget = (budget: EnhancedBudget) => {
    return budget.description?.includes('Auto-created budget');
  };

  const calculateProgress = (spent: number, amount: number) => {
    return (spent / amount) * 100;
  };

  const getProgressColor = (progress: number) => {
    if (progress > 100) return 'error';
    if (progress > 80) return 'warning';
    return 'success';
  };

  // Add this function to filter budgets by category
  const getFilteredBudgets = () => {
    return budgets.filter(budget => {
      if (selectedCategory === 'all') return true;
      
      const budgetCategory = typeof budget.category === 'string' 
        ? budget.category 
        : budget.category.name;
      
      return budgetCategory === selectedCategory;
    });
  };

  // Function to get unique categories from current budgets
  const getUniqueBudgetCategories = (): string[] => {
    const categories = budgets.map(budget => 
      typeof budget.category === 'string' ? budget.category : budget.category.name
    );
    return ['all', ...Array.from(new Set(categories))];
  };

  // Update the category filter component
  const renderCategoryFilter = () => {
    const uniqueCategories = getUniqueBudgetCategories();
    
    return (
      <FormControl sx={{ minWidth: 200, mb: 3 }}>
        <InputLabel>Filter by Category</InputLabel>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          label="Filter by Category"
        >
          {uniqueCategories.map((category) => (
            <MenuItem key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // Update the budget creation dialog to show all available categories
  const renderCategorySelect = () => (
    <FormControl fullWidth sx={{ mt: 2 }}>
      <InputLabel>Category</InputLabel>
      <Select
        value={formData.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        label="Category"
        disabled={isEditing}
      >
        {CATEGORIES.map((category) => (
          <MenuItem key={category} value={category}>
            {category}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  // Monthly overview component
  const renderMonthlyOverview = () => {
    const percentageUsed = calculatePercentage(totalSpending, totalBudget);
    const remaining = Math.max(0, totalBudget - totalSpending);
    const progress = calculateProgress(totalSpending, totalBudget);
    const progressColor = getProgressColor(progress);

    return (
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Monthly Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">Total Budget</Typography>
            <Typography variant="h6">{formatCurrency(totalBudget)}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">Total Spent</Typography>
            <Typography variant="h6" color={totalSpending > totalBudget ? 'error.main' : 'inherit'}>
              {formatCurrency(totalSpending)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">Remaining</Typography>
            <Typography variant="h6" color={remaining > 0 ? 'success.main' : 'error.main'}>
              {formatCurrency(remaining)}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <LinearProgress
              variant="determinate"
              value={progress}
              color={progressColor}
              sx={{ height: 8, borderRadius: 4, mt: 2 }}
            />
            <Typography variant="caption" align="right" display="block" sx={{ mt: 1 }}>
              {progress.toFixed(1)}% of budget used
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // Add this function to debug budget transactions
  const debugBudgetTransactions = async (budget: EnhancedBudget) => {
    try {
      console.log('DEBUG: Fetching transactions for budget:', {
        id: budget.id,
        category: typeof budget.category === 'string' ? budget.category : budget.category.name,
        startDate: budget.startDate,
        endDate: budget.endDate
      });
      
      // Fetch transactions directly with explicit date filtering
      const response = await transactionService.getAll({
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: typeof budget.category === 'string' ? budget.category : budget.category.name,
        type: 'EXPENSE'
      });
      
      console.log('DEBUG: Transactions for this budget:', {
        count: response.data.length,
        transactions: response.data.map(t => ({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount
        }))
      });
      
      // Compare with what's shown in the budget
      console.log('DEBUG: Budget spent amount:', budget.spent);
      
      // Calculate what the spent should be
      const calculatedSpent = response.data.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      console.log('DEBUG: Calculated spent from transactions:', calculatedSpent);
      
      // Check for discrepancy
      if (Number(budget.spent) !== calculatedSpent) {
        console.error('DEBUG: Discrepancy detected!', {
          budgetSpent: Number(budget.spent),
          calculatedSpent,
          difference: Number(budget.spent) - calculatedSpent
        });
      }
    } catch (error) {
      console.error('DEBUG: Error debugging budget:', error);
    }
  };

  // Add this function to directly debug transactions for a budget
  const debugBudgetTransactionsDirectly = async (budget: EnhancedBudget) => {
    try {
      console.log('DEBUG DIRECT: Fetching transactions for budget:', {
        id: budget.id,
        category: typeof budget.category === 'string' ? budget.category : budget.category.name,
        startDate: budget.startDate,
        endDate: budget.endDate
      });
      
      // Make a direct API call to get transactions
      const response = await fetch(`/api/transactions?startDate=${budget.startDate}&endDate=${budget.endDate}&category=${typeof budget.category === 'string' ? budget.category : budget.category.name}&type=EXPENSE`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('DEBUG DIRECT: Raw API response:', data);
      
      // Log each transaction
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((t: any) => {
          console.log(`Transaction: ${t.id}, Date: ${t.date}, Description: ${t.description}, Amount: ${t.amount}`);
        });
      }
      
      return data;
    } catch (error) {
      console.error('DEBUG DIRECT: Error fetching transactions:', error);
      return null;
    }
  };

  // Update the handleViewTransactions function to log more details
  const handleViewTransactions = async (budget: EnhancedBudget) => {
    const budgetId = budget.id;
    
    // Toggle expansion
    setExpandedBudgets(prev => ({
      ...prev,
      [budgetId]: !prev[budgetId]
    }));
    
    // If already loaded and we're just collapsing, don't fetch again
    if (expandedBudgets[budgetId] && budgetTransactions[budgetId]) {
      return;
    }
    
    // Set loading state for this specific budget
    setLoadingBudgetTransactions(prev => ({
      ...prev,
      [budgetId]: true
    }));
    
    try {
      const categoryName = typeof budget.category === 'string' 
        ? budget.category 
        : budget.category.name;
      
      console.log('Fetching transactions for budget:', {
        id: budget.id,
        category: categoryName,
        startDate: budget.startDate,
        endDate: budget.endDate
      });
      
      // Add debug call
      await debugBudgetTransactions(budget);
      
      // Add direct debug call
      await debugBudgetTransactionsDirectly(budget);
      
      // Request all transactions by setting a large pageSize
      const response = await transactionService.getAll({
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: categoryName,
        type: 'EXPENSE',
        sortBy: 'date',
        sortOrder: 'DESC',
        pageSize: 1000 // Set a large page size to get all transactions
      });
      
      console.log(`Found ${response.data.length} transactions for budget ${budget.id}`);
      
      // Log each transaction with date comparison
      response.data.forEach(transaction => {
        debugDateComparison(transaction, budget);
      });
      
      // Store the transactions for this budget
      setBudgetTransactions(prev => ({
        ...prev,
        [budgetId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching budget transactions:', error);
      setError('Failed to load transactions for this budget');
    } finally {
      setLoadingBudgetTransactions(prev => ({
        ...prev,
        [budgetId]: false
      }));
    }
  };

  const handleCloseTransactions = () => {
    setSelectedBudgetId(null);
    setSelectedBudgetTransactions([]);
  };

  // Update the renderBudgetTransactions function to properly filter transactions by date
  const renderBudgetTransactions = (budget: EnhancedBudget) => {
    const budgetId = budget.id;
    const isExpanded = expandedBudgets[budgetId] || false;
    const transactions = budgetTransactions[budgetId] || [];
    const isLoading = loadingBudgetTransactions[budgetId] || false;
    
    if (!isExpanded) return null;
    
    // Filter transactions to ensure they're within the budget date range
    const filteredTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const budgetStartDate = new Date(budget.startDate);
      const budgetEndDate = new Date(budget.endDate);
      
      // Set time to noon to avoid timezone issues
      transactionDate.setHours(12, 0, 0, 0);
      budgetStartDate.setHours(12, 0, 0, 0);
      budgetEndDate.setHours(12, 0, 0, 0);
      
      return transactionDate >= budgetStartDate && transactionDate <= budgetEndDate;
    });
    
    console.log(`Filtered transactions for budget ${budget.id}:`, {
      total: transactions.length,
      filtered: filteredTransactions.length,
      startDate: budget.startDate,
      endDate: budget.endDate
    });
    
    return (
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 2 }} />
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : filteredTransactions.length === 0 ? (
          <Typography variant="body2" sx={{ py: 2, textAlign: 'center' }}>
            No transactions found for this budget period.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Category</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(new Date(transaction.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell align="right">{formatCurrency(Math.abs(transaction.amount))}</TableCell>
                    <TableCell>
                      {typeof transaction.category === 'string' 
                        ? transaction.category 
                        : transaction.category?.name || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} align="right">
                    <strong>Total:</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>
                      {formatCurrency(
                        filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      )}
                    </strong>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        )}
      </Collapse>
    );
  };

  // Add this function to debug transaction dates
  const debugTransactionDates = () => {
    console.log('DEBUG: All transactions:', transactions.map(t => ({
      id: t.id,
      date: t.date,
      dateObj: new Date(t.date),
      description: t.description,
      amount: t.amount,
      category: typeof t.category === 'string' ? t.category : t.category?.name
    })));
    
    // Group transactions by month
    const transactionsByMonth = transactions.reduce((acc, t) => {
      const month = format(new Date(t.date), 'yyyy-MM');
      if (!acc[month]) acc[month] = [];
      acc[month].push(t);
      return acc;
    }, {} as Record<string, Transaction[]>);
    
    console.log('DEBUG: Transactions grouped by month:', Object.entries(transactionsByMonth).map(([month, txs]) => ({
      month,
      count: txs.length,
      total: txs.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    })));
  };

  // Call this in useEffect after setting transactions
  useEffect(() => {
    if (transactions.length > 0) {
      debugTransactionDates();
    }
  }, [transactions]);

  // Add this function to call the recalculate endpoint
  const handleRecalculateBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/budgets/recalculate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      setSnackbar({
        open: true,
        message: result.message,
        severity: 'success'
      });
      
      // Refresh budgets after recalculation
      fetchData();
    } catch (error) {
      console.error('Error recalculating budgets:', error);
      setError('Failed to recalculate budgets. Please try again.');
      setSnackbar({
        open: true,
        message: 'Failed to recalculate budgets',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this function to recalculate the current month's budgets
  const handleRecalculateCurrentMonth = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      setSnackbar({
        open: true,
        message: `Recalculating budgets for ${format(selectedMonth, 'MMMM yyyy')}...`,
        severity: 'info'
      });
      
      // Call the recalculate endpoint
      const response = await fetch('/api/budgets/recalculate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ startDate, endDate })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Refresh the data
      const budgetsData = await budgetService.getAll({
        startDate,
        endDate
      });
      
      setBudgets(budgetsData as EnhancedBudget[]);
      
      setSnackbar({
        open: true,
        message: `Successfully recalculated ${result.updatedBudgets} budgets for ${format(selectedMonth, 'MMMM yyyy')}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error recalculating budgets:', error);
      setError('Failed to recalculate budgets. Please try again.');
      setSnackbar({
        open: true,
        message: 'Failed to recalculate budgets',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this function to debug date range issues
  const debugDateRange = async () => {
    try {
      const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      console.log('Debugging date range:', { startDate, endDate });
      
      const response = await fetch(`/api/transactions/debug-date-range?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Date range debug results:', data);
      
      // Show results in a snackbar
      setSnackbar({
        open: true,
        message: `Found ${data.totalCount} transactions in date range`,
        severity: 'info'
      });
      
      return data;
    } catch (error) {
      console.error('Error debugging date range:', error);
      setSnackbar({
        open: true,
        message: 'Error debugging date range',
        severity: 'error'
      });
      return null;
    }
  };

  // Add this function to debug date comparison
  const debugDateComparison = (transaction: Transaction, budget: EnhancedBudget) => {
    const transactionDate = new Date(transaction.date);
    const budgetStartDate = new Date(budget.startDate);
    const budgetEndDate = new Date(budget.endDate);
    
    // Set time to noon to avoid timezone issues
    transactionDate.setHours(12, 0, 0, 0);
    budgetStartDate.setHours(12, 0, 0, 0);
    budgetEndDate.setHours(12, 0, 0, 0);
    
    const isInRange = transactionDate >= budgetStartDate && transactionDate <= budgetEndDate;
    
    console.log('Date comparison:', {
      transactionId: transaction.id,
      transactionDate: transaction.date,
      transactionDateObj: transactionDate.toISOString(),
      budgetStartDate: budget.startDate,
      budgetStartDateObj: budgetStartDate.toISOString(),
      budgetEndDate: budget.endDate,
      budgetEndDateObj: budgetEndDate.toISOString(),
      isInRange
    });
    
    return isInRange;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Budget
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {renderCategoryFilter()}

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              views={['month', 'year']}
              label="Select Month"
              minDate={new Date('2020-01-01')}
              maxDate={new Date('2030-12-31')}
              value={selectedMonth}
              onChange={(newValue) => {
                if (newValue) {
                  setSelectedMonth(newValue);
                }
              }}
              slotProps={{
                textField: {
                  variant: 'outlined',
                  size: 'small'
                }
              }}
            />
          </LocalizationProvider>

          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRecalculateBudgets}
            disabled={loading}
          >
            Recalculate Budgets
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRecalculateCurrentMonth}
            disabled={loading}
          >
            Recalculate Current Month
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={debugDateRange}
            disabled={loading}
          >
            Debug Date Range
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={handleAddBudget}
          >
            Add Budget
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            {renderMonthlyOverview()}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Budget Allocation
            </Typography>
            {budgets.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                <Typography variant="body1" color="text.secondary" align="center">
                  No budgets created yet. Add your first budget to see allocation.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePieChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {preparePieChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend />
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Budget Categories
        </Typography>
        
        {budgets.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 2 }}>
              You haven't created any budgets yet. Start by creating a budget for each spending category.
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />} 
              onClick={handleAddBudget}
              sx={{ mt: 2 }}
            >
              Create your first budget
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {getFilteredBudgets().map((budget) => {
              const spent = calculateSpending(budget);
              const percentage = calculatePercentage(spent, budget.amount);
              const isOverBudget = spent > budget.amount;
              const progress = calculateProgress(spent, budget.amount);
              const progressColor = getProgressColor(progress);
              const remaining = budget.amount - spent;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={budget.id}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderLeft: '4px solid',
                      borderColor: isAutoCreatedBudget(budget) ? 'warning.main' : 'primary.main',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {typeof budget.category === 'string' ? budget.category : budget.category.name}
                        {isAutoCreatedBudget(budget) && (
                          <Chip 
                            size="small" 
                            label="Auto-created" 
                            color="warning" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                          />
                        )}
                      </Typography>
                      <Box>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditBudget(budget)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeleteBudget(budget.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {budget.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {budget.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 'auto' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Budget</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(budget.amount)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Spent</Typography>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={isOverBudget ? 'error.main' : 'inherit'}
                        >
                          {formatCurrency(spent)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Remaining</Typography>
                        <Typography 
                          variant="body2" 
                          fontWeight="medium"
                          color={isOverBudget ? 'error.main' : 'success.main'}
                        >
                          {formatCurrency(Math.max(0, remaining))}
                        </Typography>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={progress}
                        color={progressColor}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      
                      <Typography variant="caption" align="right" display="block">
                        {progress.toFixed(1)}% used
                      </Typography>
                    </Box>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleViewTransactions(budget)}
                        startIcon={expandedBudgets[budget.id] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        fullWidth
                      >
                        {expandedBudgets[budget.id] ? 'Hide Transactions' : 'View Transactions'}
                      </Button>
                    </Box>

                    {renderBudgetTransactions(budget)}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Budget Form Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Budget' : 'Create Budget'}
        </DialogTitle>
        <DialogContent>
          {renderCategorySelect()}
          
          <TextField
            fullWidth
            margin="normal"
            label="Amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
          />
          
          <TextField
            fullWidth
            margin="normal"
            label="Description (Optional)"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.category || formData.amount <= 0}
          >
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar component */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Budget; 