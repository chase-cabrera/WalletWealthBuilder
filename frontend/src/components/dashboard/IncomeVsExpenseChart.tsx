import React, { useEffect, useState, useRef } from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import transactionService from '../../services/transactionService';
import { Transaction } from '../../services/transactionService';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface IncomeVsExpenseChartProps {
  transactions?: Transaction[];
}

const IncomeVsExpenseChart: React.FC<IncomeVsExpenseChartProps> = ({ transactions }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const dataFetchedRef = useRef(false);
  const theme = useTheme();

  useEffect(() => {
    // Only fetch data if we haven't fetched before
    if (dataFetchedRef.current) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // If we already have sample data, don't fetch
        if (chartData.length > 0) {
          setLoading(false);
          return;
        }
        
        const today = new Date();
        const monthsData = [];

        // Fetch data for the last 6 months
        for (let i = 0; i < 6; i++) {
          const monthDate = subMonths(today, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const startDateStr = format(monthStart, 'yyyy-MM-dd');
          const endDateStr = format(monthEnd, 'yyyy-MM-dd');
          
          const transactions = await transactionService.getAll({
            startDate: startDateStr,
            endDate: endDateStr
          });
          
          // Calculate income and expenses
          let income = 0;
          let expenses = 0;
          
          transactions.data.forEach((transaction: Transaction) => {
            if (transaction.amount > 0) {
              income += transaction.amount;
            } else {
              expenses += Math.abs(transaction.amount);
            }
          });
          
          monthsData.push({
            name: format(monthDate, 'MMM yyyy'),
            Income: parseFloat(income.toFixed(2)),
            Expenses: parseFloat(expenses.toFixed(2)),
            Savings: parseFloat((income - expenses).toFixed(2))
          });
        }
        
        // Sort data by date (oldest to newest)
        monthsData.sort((a, b) => {
          const dateA = new Date(a.name);
          const dateB = new Date(b.name);
          return dateA.getTime() - dateB.getTime();
        });
        
        setChartData(monthsData);
        dataFetchedRef.current = true;
      } catch (error) {
        console.error('Error fetching income vs expense data:', error);
        // Use sample data if there's an error
        setChartData(getSampleData());
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
  
  const getSampleData = () => {
    const today = new Date();
    const sampleData = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const income = Math.floor(Math.random() * 3000) + 3000;
      const expenses = Math.floor(Math.random() * 2000) + 1500;
      
      sampleData.push({
        name: format(monthDate, 'MMM yyyy'),
        Income: income,
        Expenses: expenses,
        Savings: income - expenses
      });
    }
    
    return sampleData;
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            p: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: theme.shadows[3],
          }}
        >
          <Typography variant="subtitle2" color="text.primary" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <Box
                component="span"
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: entry.color,
                  mr: 1,
                  display: 'inline-block',
                }}
              />
              <Typography variant="body2" component="span" color="text.secondary">
                {entry.name}:
              </Typography>
              <Typography 
                variant="body2" 
                component="span" 
                sx={{ ml: 1, fontWeight: 'medium' }}
                color={entry.name === 'Savings' 
                  ? (entry.value >= 0 ? 'success.main' : 'error.main') 
                  : 'text.primary'
                }
              >
                {formatCurrency(entry.value)}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  const isSampleData = chartData.length === 0;
  const dataToDisplay = isSampleData ? getSampleData() : chartData;
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {isSampleData && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          Sample Data (No actual transactions yet)
        </Typography>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dataToDisplay}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 10,
          }}
          barGap={8}
          barSize={20}
        >
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.palette.success.main} stopOpacity={0.8} />
              <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.palette.error.main} stopOpacity={0.8} />
              <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.palette.info.main} stopOpacity={0.8} />
              <stop offset="95%" stopColor={theme.palette.info.main} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke={theme.palette.divider}
          />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Legend 
            wrapperStyle={{ 
              paddingTop: 20,
              fontSize: 12
            }}
            iconType="circle"
            iconSize={10}
          />
          <Bar 
            dataKey="Income" 
            name="Income" 
            fill="url(#incomeGradient)" 
            radius={[4, 4, 0, 0]}
            stroke={theme.palette.success.main}
            strokeWidth={1}
          />
          <Bar 
            dataKey="Expenses" 
            name="Expenses" 
            fill="url(#expenseGradient)" 
            radius={[4, 4, 0, 0]}
            stroke={theme.palette.error.main}
            strokeWidth={1}
          />
          <Bar 
            dataKey="Savings" 
            name="Savings" 
            fill="url(#savingsGradient)" 
            radius={[4, 4, 0, 0]}
            stroke={theme.palette.info.main}
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default IncomeVsExpenseChart; 