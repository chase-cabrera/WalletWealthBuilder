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
import GoalForm from '../components/goals/GoalForm';
import ContributeForm from '../components/goals/ContributeForm';
import goalService, { Goal, CreateGoalDto } from '../services/goalService';

const Goals: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isContributeFormOpen, setIsContributeFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>();
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await goalService.getAll();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAdd = async (data: CreateGoalDto) => {
    try {
      await goalService.create(data);
      setIsFormOpen(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  const handleEdit = async (data: CreateGoalDto) => {
    try {
      if (selectedGoal) {
        await goalService.update(selectedGoal.id, data);
        setIsFormOpen(false);
        setSelectedGoal(undefined);
        fetchGoals();
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleDelete = async (goal: Goal) => {
    try {
      await goalService.delete(goal.id);
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleContribute = async (amount: number) => {
    try {
      if (selectedGoal) {
        await goalService.contribute(selectedGoal.id, amount);
        setIsContributeFormOpen(false);
        setSelectedGoal(undefined);
        fetchGoals();
      }
    } catch (error) {
      console.error('Error contributing to goal:', error);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'success';
    if (progress >= 75) return 'info';
    if (progress >= 50) return 'primary';
    if (progress >= 25) return 'warning';
    return 'error';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
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
          Financial Goals
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedGoal(undefined);
            setIsFormOpen(true);
          }}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Add Goal
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
      ) : goals.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No goals found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Create your first financial goal to start tracking your progress
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedGoal(undefined);
              setIsFormOpen(true);
            }}
          >
            Add Goal
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {goals.map((goal) => {
            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
            const progressColor = getProgressColor(progress);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={goal.id}>
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
                        {goal.name}
                      </Typography>
                      <Chip 
                        label={goal.category} 
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
                          Progress
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
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
                          Current
                        </Typography>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          ${goal.currentAmount.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="text.secondary">
                          Target
                        </Typography>
                        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                          ${goal.targetAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Target Date: {formatDate(goal.targetDate)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', p: 2, pt: 0 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsContributeFormOpen(true);
                      }}
                    >
                      Contribute
                    </Button>
                    <Box>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedGoal(goal);
                          setIsFormOpen(true);
                        }}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(goal)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Mobile FAB for adding goals */}
      {isMobile && (
        <Fab 
          color="primary" 
          aria-label="add goal"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            display: { xs: 'flex', sm: 'none' }
          }}
          onClick={() => {
            setSelectedGoal(undefined);
            setIsFormOpen(true);
          }}
        >
          <AddIcon />
        </Fab>
      )}

      <GoalForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedGoal(undefined);
        }}
        onSubmit={selectedGoal ? handleEdit : handleAdd}
        goal={selectedGoal}
      />

      <ContributeForm
        open={isContributeFormOpen}
        onClose={() => {
          setIsContributeFormOpen(false);
          setSelectedGoal(undefined);
        }}
        onSubmit={handleContribute}
        goal={selectedGoal}
      />
    </Box>
  );
};

export default Goals; 