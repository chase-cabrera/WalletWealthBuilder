import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
  Grid,
  CircularProgress,
  InputAdornment,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Stack,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Transaction, CreateTransactionDto, Category } from '../../services/transactionService';
import { format, parseISO } from 'date-fns';
import { Account } from '../../services/accountService';
import categoryService from '../../services/categoryService';
import { CategoryObject } from '../../types/Transaction';
import { Category as CategoryType } from '../../types/Category';
import { DEFAULT_CATEGORIES } from '../../constants/categories';

// Helper function to safely get category name
const getCategoryName = (category: any): string => {
  if (!category) return '';
  
  if (typeof category === 'string') {
    return category;
  }
  
  if (typeof category === 'object' && category !== null && 'name' in category) {
    return category.name;
  }
  
  return '';
};

interface TransactionFormProps {
  open?: boolean;
  onClose?: () => void;
  onSubmit: (data: CreateTransactionDto | Partial<Transaction>) => void;
  onCancel?: () => void;
  transaction?: Transaction;
  initialData?: Partial<Transaction>;
  accounts?: Account[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open = true,
  onClose,
  onSubmit,
  onCancel,
  transaction,
  initialData,
  accounts = [],
}) => {
  // Use initialData if provided, otherwise use transaction
  const data = initialData || transaction || {
    amount: 0,
    description: '',
    vendor: '',
    purchaser: '',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'EXPENSE',
    category: '',
    accountId: accounts.length > 0 ? accounts[0].id : undefined,
  };
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    ...data,
    category: getCategoryName(data.category),
  });
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    // Ensure all fields have default values to prevent undefined values
    setFormData({
      amount: data.amount ?? 0,
      description: data.description ?? '',
      vendor: data.vendor ?? '',
      purchaser: data.purchaser ?? '',
      note: data.note ?? '',
      date: data.date ?? format(new Date(), 'yyyy-MM-dd'),
      type: data.type ?? 'EXPENSE',
      category: getCategoryName(data.category),
      accountId: data.accountId ?? undefined,
    });
    
    // Fetch categories from the backend
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const fetchedCategories = await categoryService.getAll();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setError('Failed to load categories. Using default categories instead.');
        
        // Use default categories from constants
        setCategories(DEFAULT_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [data, accounts]);

  // Update the useEffect for handling amount sign
  useEffect(() => {
    // Only apply this logic when the type changes, not on every render
    if (formData.type === 'INCOME' && (formData.amount ?? 0) < 0) {
      setFormData(prev => ({ ...prev, amount: Math.abs(prev.amount ?? 0) }));
    } else if (formData.type === 'EXPENSE' && (formData.amount ?? 0) > 0) {
      setFormData(prev => ({ ...prev, amount: -Math.abs(prev.amount ?? 0) }));
    }
  }, [formData.type]);

  // Update the useEffect that checks categories
  useEffect(() => {
    // If categories are loaded and formData has a category that's not in the list
    if (categories.length > 0 && formData.category) {
      const categoryExists = categories.some(c => c.name === formData.category);
      if (!categoryExists) {
        // Set to empty string or first category
        setFormData(prev => ({
          ...prev,
          category: ''
        }));
      }
    }
  }, [categories]); // Remove formData.category from dependencies

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure all required fields have values before submitting
    const submissionData = {
      ...formData,
      amount: formData.amount ?? 0,
      description: formData.description ?? '',
      date: formData.date ?? format(new Date(), 'yyyy-MM-dd'),
      type: formData.type ?? 'EXPENSE',
      category: formData.category ?? 'Uncategorized',
    };
    
    // Call the onSubmit prop with the form data
    onSubmit(submissionData);
    
    // Call onCancel and onClose if they exist
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError('Category name cannot be empty');
      return;
    }

    setIsAddingCategory(true);
    setCategoryError(null);

    try {
      const newCategory = await categoryService.create({
        name: newCategoryName.trim(),
        type: formData.type as 'INCOME' | 'EXPENSE' || 'EXPENSE', // Provide a default
      });

      // Add the new category to the list
      setCategories([...categories, newCategory]);
      
      // Select the new category
      setFormData({
        ...formData,
        category: newCategory.name,
      });
      
      // Clear the input and close the dialog
      setNewCategoryName('');
      setCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to create category:', error);
      setCategoryError('Failed to create category. Please try again.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const toggleAmountSign = () => {
    setFormData({
      ...formData,
      amount: -(formData.amount ?? 0)
    });
  };

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(
    category => !category.type || category.type === formData.type
  );

  if (open === false && !onClose) {
    // Non-dialog mode
    return (
      <form onSubmit={handleSubmit}>
        {/* Form content */}
        <Box sx={{ mt: 2 }}>
          {/* Form fields */}
          <Button type="submit" variant="contained" color="primary">
            Save
          </Button>
          {onCancel && (
            <Button onClick={onCancel} sx={{ ml: 1 }}>
              Cancel
            </Button>
          )}
        </Box>
      </form>
    );
  }
  
  // Dialog mode (original return)
  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {transaction ? 'Edit Transaction' : 'Add Transaction'}
            </Typography>
            <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Alert severity="info" sx={{ mb: 2 }}>
              A budget will be automatically created for this category if one doesn't exist for the current month.
            </Alert>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    label="Type"
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as 'INCOME' | 'EXPENSE';
                      // When changing type, adjust the sign accordingly
                      const newAmount = newType === 'INCOME' 
                        ? Math.abs(formData.amount ?? 0) 
                        : -Math.abs(formData.amount ?? 0);
                      
                      setFormData({ 
                        ...formData, 
                        type: newType,
                        amount: newAmount
                      });
                    }}
                    fullWidth
                    sx={{ mb: 3 }}
                  >
                    <MenuItem value="EXPENSE">Expense</MenuItem>
                    <MenuItem value="INCOME">Income</MenuItem>
                  </TextField>
                  
                  <TextField
                    label="Amount"
                    type="number"
                    value={Math.abs(formData.amount ?? 0)}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      amount: parseFloat(e.target.value) * (formData.amount ?? 0 < 0 ? -1 : 1) 
                    })}
                    fullWidth
                    sx={{ 
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderColor: (formData.amount ?? 0) < 0 ? theme.palette.error.main : 'inherit',
                        backgroundColor: (formData.amount ?? 0) < 0 ? `${theme.palette.error.light}10` : 'inherit',
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <Typography 
                          sx={{ 
                            mr: 1, 
                            color: (formData.amount ?? 0) < 0 ? theme.palette.error.main : theme.palette.success.main,
                            fontWeight: 'bold'
                          }}
                        >
                          {(formData.amount ?? 0) < 0 ? '-$' : '$'}
                        </Typography>
                      ),
                      endAdornment: (
                        <Tooltip title="Toggle positive/negative">
                          <IconButton 
                            size="small" 
                            onClick={toggleAmountSign}
                            color={(formData.amount ?? 0) < 0 ? "error" : "success"}
                          >
                            <SwapHorizIcon />
                          </IconButton>
                        </Tooltip>
                      ),
                    }}
                    helperText={
                      <Typography variant="caption" color="text.secondary">
                        {(formData.amount ?? 0) < 0 
                          ? "Negative amount (money going out)" 
                          : "Positive amount (money coming in)"} - Click the icon to toggle
                      </Typography>
                    }
                  />
                  
                  <TextField
                    label="Description"
                    value={formData.description ?? ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    label="Vendor"
                    value={formData.vendor ?? ''}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    label="Purchaser"
                    value={formData.purchaser ?? ''}
                    onChange={(e) => setFormData({ ...formData, purchaser: e.target.value })}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Date"
                      value={formData.date ? new Date(formData.date) : new Date()}
                      onChange={(date) => {
                        if (date) {
                          setFormData({ 
                            ...formData, 
                            date: format(date, 'yyyy-MM-dd') 
                          });
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: { mb: 3 }
                        }
                      }}
                    />
                  </LocalizationProvider>
                  
                  <TextField
                    select
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    fullWidth
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.name}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  
                  <TextField
                    label="Note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    sx={{ mb: 3 }}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>Account</InputLabel>
                    <Select
                      value={formData.accountId || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        accountId: e.target.value ? Number(e.target.value) : undefined 
                      })}
                      label="Account"
                    >
                      <MenuItem value="">No Account</MenuItem>
                      {accounts?.map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button type="submit" variant="contained" color="primary">
              {transaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
            {onCancel && (
              <Button onClick={onCancel} color="inherit">
                Cancel
              </Button>
            )}
          </DialogActions>
        </form>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            error={!!categoryError}
            helperText={categoryError}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleAddCategory} 
            color="primary"
            disabled={isAddingCategory || !newCategoryName.trim()}
          >
            {isAddingCategory ? <CircularProgress size={24} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TransactionForm; 