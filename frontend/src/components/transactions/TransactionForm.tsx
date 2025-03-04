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

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionDto) => void;
  transaction?: Transaction;
  accounts?: Account[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onClose,
  onSubmit,
  transaction,
  accounts = [],
}) => {
  const [formData, setFormData] = useState<CreateTransactionDto>({
    amount: 0,
    description: '',
    vendor: '',
    purchaser: '',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'EXPENSE',
    category: '',
    accountId: accounts.length > 0 ? accounts[0].id : undefined,
  });
  
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount,
        description: transaction.description || '',
        vendor: transaction.vendor || '',
        purchaser: transaction.purchaser || '',
        note: transaction.note || '',
        date: transaction.date,
        type: transaction.type,
        category: transaction.category || '',
        accountId: transaction.accountId,
      });
      setSelectedDate(transaction.date ? parseISO(transaction.date) : new Date());
    } else {
      // Reset form for new transaction
      setFormData({
        amount: 0,
        description: '',
        vendor: '',
        purchaser: '',
        note: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'EXPENSE',
        category: '',
        accountId: accounts.length > 0 ? accounts[0].id : undefined,
      });
    }
    
    // Fetch categories from the backend
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const fetchedCategories = await categoryService.getAll();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setError('Failed to load categories. Using default categories instead.');
        // Fallback to default categories if API call fails
        setCategories([
          { id: 1, name: 'Food & Dining', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 2, name: 'Shopping', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 3, name: 'Housing', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 4, name: 'Transportation', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 5, name: 'Entertainment', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 6, name: 'Health & Fitness', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 7, name: 'Personal Care', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 8, name: 'Education', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 9, name: 'Travel', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 10, name: 'Gifts & Donations', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 11, name: 'Bills & Utilities', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 12, name: 'Income', type: 'INCOME', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 13, name: 'Taxes', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
          { id: 14, name: 'Other', type: 'EXPENSE', isDefault: true, createdAt: '', updatedAt: '' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [transaction, accounts]);

  // Add a useEffect to automatically adjust the sign based on type
  useEffect(() => {
    // Only apply this logic when the type changes, not on every render
    if (formData.type === 'INCOME' && formData.amount < 0) {
      setFormData(prev => ({ ...prev, amount: Math.abs(prev.amount) }));
    } else if (formData.type === 'EXPENSE' && formData.amount > 0) {
      setFormData(prev => ({ ...prev, amount: -Math.abs(prev.amount) }));
    }
  }, [formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
        type: formData.type,
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
      amount: -formData.amount
    });
  };

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(
    category => !category.type || category.type === formData.type
  );

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        fullScreen={fullScreen}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, bgcolor: theme.palette.background.default }}>
          <Typography variant="h6" component="div" fontWeight="bold">
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ p: 3 }}>
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
                        ? Math.abs(formData.amount) 
                        : -Math.abs(formData.amount);
                      
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
                    value={Math.abs(formData.amount)}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      amount: parseFloat(e.target.value) * (formData.amount < 0 ? -1 : 1) 
                    })}
                    fullWidth
                    sx={{ 
                      mb: 3,
                      '& .MuiOutlinedInput-root': {
                        borderColor: formData.amount < 0 ? theme.palette.error.main : 'inherit',
                        backgroundColor: formData.amount < 0 ? `${theme.palette.error.light}10` : 'inherit',
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <Typography 
                          sx={{ 
                            mr: 1, 
                            color: formData.amount < 0 ? theme.palette.error.main : theme.palette.success.main,
                            fontWeight: 'bold'
                          }}
                        >
                          {formData.amount < 0 ? '-$' : '$'}
                        </Typography>
                      ),
                      endAdornment: (
                        <Tooltip title="Toggle positive/negative">
                          <IconButton 
                            size="small" 
                            onClick={toggleAmountSign}
                            color={formData.amount < 0 ? "error" : "success"}
                          >
                            <SwapHorizIcon />
                          </IconButton>
                        </Tooltip>
                      ),
                    }}
                    helperText={
                      <Typography variant="caption" color="text.secondary">
                        {formData.amount < 0 
                          ? "Negative amount (money going out)" 
                          : "Positive amount (money coming in)"} - Click the icon to toggle
                      </Typography>
                    }
                  />
                  
                  <TextField
                    label="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    label="Vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    label="Purchaser"
                    value={formData.purchaser}
                    onChange={(e) => setFormData({ ...formData, purchaser: e.target.value })}
                    fullWidth
                    sx={{ mb: 3 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Date"
                      value={new Date(formData.date)}
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
                    sx={{ mb: 3 }}
                    InputProps={{
                      endAdornment: loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : (
                        <Tooltip title="Add new category">
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoryDialogOpen(true);
                            }}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                      ),
                    }}
                    error={!!categoryError}
                    helperText={categoryError}
                  >
                    {filteredCategories.map((category) => (
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
                  
                  <TextField
                    select
                    label="Account"
                    value={formData.accountId || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      accountId: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    fullWidth
                    sx={{ mb: 3 }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {accounts?.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {transaction ? 'Update' : 'Add'}
            </Button>
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