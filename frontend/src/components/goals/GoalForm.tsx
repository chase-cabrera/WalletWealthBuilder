import React, { useEffect } from 'react';
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CloseIcon from '@mui/icons-material/Close';
import { Goal, CreateGoalDto } from '../../services/goalService';
import { format, parseISO } from 'date-fns';

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalDto) => void;
  goal?: Goal;
}

const CATEGORIES = [
  'Emergency Fund',
  'Retirement',
  'Home Purchase',
  'Car Purchase',
  'Education',
  'Vacation',
  'Wedding',
  'Debt Payoff',
  'Other',
];

const GoalForm: React.FC<GoalFormProps> = ({
  open,
  onClose,
  onSubmit,
  goal,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = React.useState<CreateGoalDto>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: new Date().toISOString().split('T')[0],
    category: CATEGORIES[0],
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        category: goal.category,
      });
    } else {
      setFormData({
        name: '',
        targetAmount: 0,
        currentAmount: 0,
        targetDate: new Date().toISOString().split('T')[0],
        category: CATEGORIES[0],
      });
    }
  }, [goal, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 2 },
          m: { xs: 0, sm: 2 },
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {goal ? 'Edit Goal' : 'Add Goal'}
        </Typography>
        <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Goal Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              autoFocus
              variant="outlined"
              placeholder="e.g. Emergency Fund"
            />
            
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              fullWidth
              variant="outlined"
            >
              {CATEGORIES.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              label="Target Amount"
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) })}
              required
              fullWidth
              variant="outlined"
              InputProps={{
                startAdornment: '$',
              }}
            />
            
            {goal && (
              <TextField
                label="Current Amount"
                type="number"
                value={formData.currentAmount}
                onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) })}
                fullWidth
                variant="outlined"
                InputProps={{
                  startAdornment: '$',
                }}
              />
            )}
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Target Date"
                value={formData.targetDate ? new Date(formData.targetDate) : null}
                onChange={(date) => {
                  if (date) {
                    setFormData({ 
                      ...formData, 
                      targetDate: format(date, 'yyyy-MM-dd')
                    });
                  }
                }}
                slotProps={{
                  textField: {
                    variant: 'outlined',
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </LocalizationProvider>
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
            disableElevation
          >
            {goal ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GoalForm; 