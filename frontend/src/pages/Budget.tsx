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
  Snackbar
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import budgetService, { Budget as BudgetType } from '../services/budgetService';
import transactionService, { Transaction } from '../services/transactionService';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// Define category options
const CATEGORIES = [
  'Housing', 'Transportation', 'Food', 'Utilities', 'Insurance', 
  'Healthcare', 'Debt', 'Personal', 'Entertainment', 'Education',
  'Savings', 'Gifts/Donations', 'Other'
];

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
  month?: string;
}

// Enhanced Budget type with additional fields needed for the component
interface EnhancedBudget extends BudgetType {
  amount: number;
  description?: string;
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
    month: format(new Date(), 'yyyy-MM')
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });
  const theme = useTheme();

  // Fetch budgets and transactions
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch budgets
        const budgetsData = await budgetService.getAll();
        setBudgets(budgetsData as EnhancedBudget[]);
        
        // Fetch transactions for the current month
        const now = new Date();
        const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
        
        const transactionsData = await transactionService.getAll({
          startDate,
          endDate
        });
        
        // Filter for expense transactions only (negative amounts)
        setTransactions(transactionsData.data.filter((t: Transaction) => t.amount < 0));
      } catch (error) {
        console.error('Failed to fetch budget data:', error);
        setError('Failed to load budget data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate spending by category
  const calculateSpending = (category: string): number => {
    return Math.abs(transactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0));
  };

  // Calculate total budget
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  
  // Calculate total spending
  const totalSpending = Math.abs(transactions.reduce((sum, t) => sum + t.amount, 0));

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
      month: format(new Date(), 'yyyy-MM')
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  // Handle dialog open for editing budget
  const handleEditBudget = (budget: EnhancedBudget) => {
    setFormData({
      id: budget.id,
      category: budget.category,
      amount: budget.amount,
      description: budget.description || '',
      month: format(new Date(), 'yyyy-MM')
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
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      console.log('Attempting to save budget with data:', formData);
      
      // Make sure amount and limit are positive numbers
      const amount = Math.abs(formData.amount);
      
      // Create a complete data object with all required fields for the API
      const apiData = {
        category: formData.category,
        amount: amount,
        description: formData.description || '',
        // Make sure limit is a positive number
        limit: amount, // Same as amount
        period: 'MONTHLY',
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
      };
      
      console.log('Sending budget data to API:', apiData);
      
      if (isEditing && formData.id) {
        // Update existing budget
        await budgetService.update(formData.id, apiData);
        console.log('Successfully updated budget');
        showSnackbar('Budget updated successfully', 'success');
      } else {
        // Create new budget
        const result = await budgetService.create(apiData);
        console.log('Budget creation response:', result);
        showSnackbar('Budget created successfully', 'success');
      }
      
      setOpenDialog(false);
      fetchBudgets();
    } catch (error: any) {
      console.error('Budget save error:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        
        // Show more specific error message if available
        let errorMessage = 'Failed to save budget. Please try again.';
        
        if (error.response.data?.message) {
          // Handle array of error messages
          if (Array.isArray(error.response.data.message)) {
            errorMessage = error.response.data.message.join(', ');
          } else {
            errorMessage = error.response.data.message;
          }
        }
        
        showSnackbar(errorMessage, 'error');
      } else if (error.request) {
        console.error('No response received:', error.request);
        showSnackbar('Server did not respond. Please check your connection.', 'error');
      } else {
        console.error('Error message:', error.message);
        showSnackbar('Failed to save budget. Please try again.', 'error');
      }
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

  // Refresh data
  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      // Fetch budgets
      const budgetsData = await budgetService.getAll();
      setBudgets(budgetsData as EnhancedBudget[]);
      
      // Fetch transactions for the current month
      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      
      const transactionsData = await transactionService.getAll({
        startDate,
        endDate
      });
      
      // Filter for expense transactions only (negative amounts)
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
      const spent = calculateSpending(budget.category);
      return {
        name: budget.category,
        value: budget.amount,
        spent: spent,
        remaining: Math.max(0, budget.amount - spent),
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
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Budget
        </Typography>
        <Box>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
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
            <Typography variant="h6" gutterBottom>
              Monthly Overview
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Total Budget</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(totalBudget)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Total Spent</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(totalSpending)}
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1">Remaining</Typography>
                <Typography 
                  variant="body1" 
                  fontWeight="bold"
                  color={totalSpending > totalBudget ? 'error.main' : 'success.main'}
                >
                  {formatCurrency(Math.max(0, totalBudget - totalSpending))}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={calculatePercentage(totalSpending, totalBudget)}
                color={totalSpending > totalBudget ? 'error' : 'primary'}
                sx={{ height: 10, borderRadius: 5, mt: 2 }}
              />
              <Typography variant="caption" align="right" display="block" sx={{ mt: 1 }}>
                {calculatePercentage(totalSpending, totalBudget).toFixed(1)}% of budget used
              </Typography>
            </Box>
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
            {budgets.map((budget) => {
              const spent = calculateSpending(budget.category);
              const percentage = calculatePercentage(spent, budget.amount);
              const isOverBudget = spent > budget.amount;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={budget.id}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {budget.category}
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
                          {formatCurrency(Math.max(0, budget.amount - spent))}
                        </Typography>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage}
                        color={isOverBudget ? 'error' : 'primary'}
                        sx={{ height: 8, borderRadius: 4, mb: 1 }}
                      />
                      
                      <Typography variant="caption" align="right" display="block">
                        {percentage.toFixed(1)}% used
                      </Typography>
                    </Box>
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
          {isEditing ? 'Edit Budget' : 'Add New Budget'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="category-label">Category</InputLabel>
              <Select
                labelId="category-label"
                id="category"
                name="category"
                value={formData.category}
                label="Category"
                onChange={handleSelectChange}
              >
                {CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
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
          </Box>
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