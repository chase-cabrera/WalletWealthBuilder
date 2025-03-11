import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  useMediaQuery,
  useTheme,
  IconButton,
  Typography,
} from '@mui/material';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import CloseIcon from '@mui/icons-material/Close';
import { Budget, CreateBudgetDto } from '../../services/budgetService';
import { Category } from '../../types/Category';
import categoryService from '../../services/categoryService';

interface BudgetFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBudgetDto) => void;
  budget?: Budget;
}

interface FormData {
  category: string;
  amount: number;
  description?: string;
}

const BudgetForm: React.FC<BudgetFormProps> = ({
  open,
  onClose,
  onSubmit,
  budget,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState<FormData>({
    category: '',
    amount: 0,
    description: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await categoryService.getAll();
        setCategories(response);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (budget) {
      setFormData({
        category: typeof budget.category === 'string' ? budget.category : budget.category.name,
        amount: budget.amount,
        description: budget.description || ''
      });
    } else {
      setFormData({
        category: '',
        amount: 0,
        description: ''
      });
    }
  }, [budget, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Automatically set the start and end dates to current month
    const now = new Date();
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

    onSubmit({
      ...formData,
      startDate,
      endDate,
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {budget ? 'Edit Budget' : 'Add Budget'}
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              fullWidth
              variant="outlined"
              disabled={loading}
              error={!!error}
              helperText={error}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              label="Monthly Budget Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              required
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: '$',
              }}
            />
            
            <TextField
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              variant="outlined"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {budget ? 'Save Changes' : 'Create Budget'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BudgetForm; 