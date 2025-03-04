import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  IconButton,
  Fab,
  LinearProgress,
  useMediaQuery,
  useTheme,
  Skeleton,
  Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import BudgetForm from '../components/budgets/BudgetForm';
import budgetService, { Budget, CreateBudgetDto } from '../services/budgetService';

const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>();
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const data = await budgetService.getAll();
      setBudgets(data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleAdd = async (data: CreateBudgetDto) => {
    try {
      await budgetService.create(data);
      setIsFormOpen(false);
      fetchBudgets();
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const handleEdit = async (data: CreateBudgetDto) => {
    try {
      if (selectedBudget) {
        await budgetService.update(selectedBudget.id, data);
        setIsFormOpen(false);
        setSelectedBudget(undefined);
        fetchBudgets();
      }
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleDelete = async (budget: Budget) => {
    try {
      await budgetService.delete(budget.id);
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const calculateProgress = (spent: number, limit: number) => {
    return Math.min((spent / limit) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'error';
    if (progress >= 75) return 'warning';
    if (progress >= 50) return 'info';
    return 'success';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'WEEKLY': return 'Weekly';
      case 'MONTHLY': return 'Monthly';
      case 'QUARTERLY': return 'Quarterly';
      case 'YEARLY': return 'Yearly';
      default: return period;
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Budgets
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedBudget(undefined);
            setIsFormOpen(true);
          }}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Add Budget
        </Button>
      </Box>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : budgets.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No budgets found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create your first budget to start tracking your spending
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedBudget(undefined);
              setIsFormOpen(true);
            }}
          >
            Add Budget
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {budgets.map((budget) => {
            const progress = calculateProgress(budget.spent, budget.limit);
            const progressColor = getProgressColor(progress);
            const remaining = budget.limit - budget.spent;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={budget.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: '0px 6px 12px -3px rgba(0,0,0,0.1)',
                    },
                    transition: 'box-shadow 0.3s ease-in-out',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {budget.category}
                      </Typography>
                      <Chip 
                        label={getPeriodLabel(budget.period)} 
                        size="small" 
                        sx={{ 
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          fontWeight: 500,
                        }} 
                      />
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {progress >= 100 ? 'Over Budget' : 'Budget Used'}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color={progress >= 100 ? 'error.main' : 'inherit'}>
                          {progress.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        color={progressColor as any}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Spent
                        </Typography>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          ${budget.spent.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="text.secondary">
                          Limit
                        </Typography>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          ${budget.limit.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Remaining: <span style={{ fontWeight: 'bold', color: remaining < 0 ? theme.palette.error.main : 'inherit' }}>
                          ${remaining.toFixed(2)}
                        </span>
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {formatDate(budget.startDate)} - {formatDate(budget.endDate)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setSelectedBudget(budget);
                        setIsFormOpen(true);
                      }}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDelete(budget)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Mobile FAB for adding budgets */}
      {isMobile && (
        <Fab 
          color="primary" 
          aria-label="add budget"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            display: { xs: 'flex', sm: 'none' }
          }}
          onClick={() => {
            setSelectedBudget(undefined);
            setIsFormOpen(true);
          }}
        >
          <AddIcon />
        </Fab>
      )}

      <BudgetForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedBudget(undefined);
        }}
        onSubmit={selectedBudget ? handleEdit : handleAdd}
        budget={selectedBudget}
      />
    </Box>
  );
};

export default Budgets; 