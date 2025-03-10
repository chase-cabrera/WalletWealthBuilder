import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, useTheme, CircularProgress, Chip, Stack, useMediaQuery } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts';
import { Transaction } from '../../services/transactionService';
import { CategoryObject } from '../../types/Transaction';
import transactionService from '../../services/transactionService';
import categoryService from '../../services/categoryService';

interface SpendingByCategoryChartProps {
  transactions: Transaction[];
}

interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

const SpendingByCategoryChart: React.FC<SpendingByCategoryChartProps> = ({ transactions: propTransactions }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const dataFetchedRef = useRef(false);
  const [hasRealData, setHasRealData] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  useEffect(() => {
    // Always fetch data directly from the API
    if (!dataFetchedRef.current) {
      fetchTransactions();
    }
  }, []);
  
  const fetchTransactions = async () => {
    console.log("SpendingByCategoryChart: Fetching transactions directly from API");
    setLoading(true);
    
    try {
      // Fetch all transactions
      const response = await transactionService.getAll({
        pageSize: 1000,
        type: 'EXPENSE'
      });
      
      console.log("SpendingByCategoryChart: Fetched transactions directly:", response.data);
      
      if (response.data && response.data.length > 0) {
        processTransactionData(response.data);
      } else {
        setCategoryData([]);
        setHasRealData(false);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setCategoryData([]);
      setHasRealData(false);
    } finally {
      setLoading(false);
      dataFetchedRef.current = true;
    }
  };
  
  const processTransactionData = (transactionsToProcess: Transaction[]) => {
    console.log("Processing transactions:", transactionsToProcess);
    
    // Check if these are real transactions or sample data
    const isRealData = transactionsToProcess.some(t => t.id > 5);
    console.log("Are these real transactions in processTransactionData?", isRealData);
    
    // Filter only expense transactions
    const expenseTransactions = transactionsToProcess.filter(t => {
      // Check if it's an expense by type or by negative amount
      const isExpense = t.type === 'EXPENSE' || t.amount < 0;
      return isExpense;
    });
    
    console.log("Expense transactions:", expenseTransactions);
    
    if (expenseTransactions.length === 0) {
      console.log("No expense transactions found");
      setCategoryData([]);
      setHasRealData(false);
      return;
    }
    
    // Add a helper function to get category name
    const getCategoryName = (category: string | CategoryObject | undefined): string => {
      if (!category) return 'Uncategorized';
      
      if (typeof category === 'string') {
        return category;
      }
      
      return category.name;
    };
    
    // Then update the spending calculation
    const spendingByCategory = expenseTransactions.reduce((acc, transaction) => {
      const categoryName = getCategoryName(transaction.category);
      const amount = Math.abs(transaction.amount);
      
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      
      acc[categoryName] += amount;
      return acc;
    }, {} as Record<string, number>);
    
    console.log("Category map:", spendingByCategory);
    
    // Convert to array format for the pie chart
    const data = Object.entries(spendingByCategory).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
    
    // Sort by value (highest first)
    data.sort((a, b) => b.value - a.value);
    
    // Limit to top 10 categories, group the rest as "Other"
    if (data.length > 10) {
      const topCategories = data.slice(0, 9);
      const otherCategories = data.slice(9);
      
      const otherValue = otherCategories.reduce((sum, category) => sum + category.value, 0);
      
      topCategories.push({
        name: 'Other',
        value: parseFloat(otherValue.toFixed(2))
      });
      
      setCategoryData(topCategories);
    } else {
      setCategoryData(data);
    }
    
    setHasRealData(isRealData && data.length > 0);
  };
  
  // Sample data to show when no real data is available
  const sampleData = [
    { name: 'Food & Dining', value: 450 },
    { name: 'Housing', value: 1200 },
    { name: 'Transportation', value: 350 },
    { name: 'Entertainment', value: 200 },
    { name: 'Shopping', value: 300 },
  ];
  
  // Enhanced color palette
  const COLORS = [
    '#3498db', // Blue
    '#9b59b6', // Purple
    '#2ecc71', // Green
    '#f39c12', // Orange
    '#e74c3c', // Red
    '#1abc9c', // Teal
    '#d35400', // Dark Orange
    '#8e44ad', // Dark Purple
    '#27ae60', // Dark Green
    '#3498db', // Blue
    '#e67e22', // Orange
    '#16a085', // Dark Teal
    '#c0392b', // Dark Red
    '#7f8c8d', // Gray
    '#2c3e50', // Dark Blue
  ];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const formatPercentage = (percent: number) => {
    return `${(percent * 100).toFixed(0)}%`;
  };
  
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(undefined);
  };
  
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  
    return (
      <g>
        <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={theme.palette.text.primary} fontWeight="bold">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill={theme.palette.text.secondary}>
          {formatCurrency(value)}
        </text>
        <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill={theme.palette.text.secondary}>
          {formatPercentage(percent)}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
      </g>
    );
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ 
          bgcolor: 'background.paper', 
          p: 1.5, 
          border: '1px solid', 
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 1
        }}>
          <Typography variant="subtitle2" color="text.primary" fontWeight="bold">
            {payload[0].name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatCurrency(payload[0].value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPercentage(payload[0].payload.percent)}
          </Typography>
        </Box>
      );
    }
    
    return null;
  };
  
  // Custom legend that uses chips
  const CustomLegend = ({ payload }: any) => {
    return (
      <Stack 
        direction="row" 
        spacing={1} 
        flexWrap="wrap" 
        justifyContent="center"
        sx={{ mt: 2, gap: 1 }}
      >
        {payload.map((entry: any, index: number) => (
          <Chip
            key={`legend-${index}`}
            label={`${entry.value}: ${formatPercentage(entry.payload.percent)}`}
            sx={{
              backgroundColor: entry.color,
              color: theme.palette.getContrastText(entry.color),
              fontWeight: 'medium',
              '&:hover': {
                backgroundColor: entry.color,
                opacity: 0.9,
              }
            }}
          />
        ))}
      </Stack>
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  
  console.log("Rendering with hasRealData:", hasRealData, "categoryData:", categoryData);
  
  // Use sample data if no real data is available
  const chartData = categoryData.length > 0 ? categoryData : sampleData;
  const isSampleData = !hasRealData || categoryData.length === 0;
  
  // Calculate total for percentage
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  
  // Add percentage to each item
  const chartDataWithPercentage = chartData.map(item => ({
    ...item,
    percent: item.value / total
  }));
  
  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {isSampleData && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center" 
          sx={{ mb: 2 }}
        >
          Sample Data (No actual transactions yet)
        </Typography>
      )}
      
      <Box sx={{ flexGrow: 1, minHeight: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={chartDataWithPercentage}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 40 : 60}
              outerRadius={isMobile ? 80 : 100}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              paddingAngle={2}
            >
              {chartDataWithPercentage.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      
      <CustomLegend 
        payload={chartDataWithPercentage.map((entry, index) => ({
          value: entry.name,
          color: COLORS[index % COLORS.length],
          payload: entry
        }))} 
      />
    </Box>
  );
};

export default SpendingByCategoryChart; 