import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Account } from '../../services/accountService';

interface AccountBalanceChartProps {
  accounts?: Account[];
}

const AccountBalanceChart: React.FC<AccountBalanceChartProps> = ({ accounts }) => {
  const [loading, setLoading] = useState(false);
  const [isSampleData, setIsSampleData] = useState(false);
  const theme = useTheme();
  
  // Sample data to show when no real data is available
  const sampleData = [
    { name: 'Checking', balance: 2500, color: theme.palette.primary.main },
    { name: 'Savings', balance: 10000, color: theme.palette.success.main },
    { name: 'Credit Card', balance: -1500, color: theme.palette.error.main },
    { name: 'Investment', balance: 15000, color: theme.palette.warning.main }
  ];
  
  // Determine if we should use sample data
  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      setIsSampleData(true);
    } else {
      setIsSampleData(false);
    }
    setLoading(false);
  }, [accounts]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Prepare data for the chart
  const chartData = isSampleData 
    ? sampleData 
    : accounts?.map(account => ({
        name: account.name,
        balance: account.balance,
        color: getColorForAccountType(account.type)
      })) || [];
  
  // Find the minimum and maximum values for the Y-axis domain
  const minBalance = Math.min(...chartData.map(item => item.balance), 0);
  const maxBalance = Math.max(...chartData.map(item => item.balance), 0);
  
  // Calculate padding for the domain to make the chart look better
  const yAxisDomain = chartData.length > 0 
    ? [minBalance < 0 ? minBalance * 1.1 : 0, maxBalance * 1.1] 
    : [0, 100];
  
  function getColorForAccountType(type: string): string {
    switch (type?.toLowerCase()) {
      case 'checking':
        return theme.palette.primary.main;
      case 'savings':
        return theme.palette.success.main;
      case 'credit card':
        return theme.palette.error.main;
      case 'investment':
        return theme.palette.warning.main;
      default:
        return theme.palette.secondary.main;
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };
  
  // Custom bar component to use dynamic colors with gradient
  const renderCustomBar = (props: any) => {
    const { x, y, width, height, index } = props;
    const data = chartData[index];
    const color = data.color;
    const isNegative = data.balance < 0;
    
    // For negative values, the y and height are different
    const barY = isNegative ? y : y;
    const barHeight = Math.abs(height); // Use absolute value for height
    
    // Create gradient ID
    const gradientId = `barGradient-${index}`;
    
    return (
      <g>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.8} />
            <stop offset="95%" stopColor={color} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <rect 
          x={x} 
          y={barY} 
          width={width} 
          height={barHeight} 
          fill={`url(#${gradientId})`}
          rx={4}
          ry={4}
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.8}
        />
      </g>
    );
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
            {data.name}
          </Typography>
          <Typography 
            variant="body2" 
            color={data.balance >= 0 ? 'success.main' : 'error.main'}
            fontWeight="medium"
          >
            {formatCurrency(data.balance)}
          </Typography>
        </Box>
      );
    }
    return null;
  };
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {isSampleData && (
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2, fontStyle: 'italic' }}>
          Sample Data (No actual accounts yet)
        </Typography>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          barGap={8}
          barSize={40}
        >
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
            domain={yAxisDomain}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          {/* Add a reference line at y=0 to clearly show positive vs negative */}
          <ReferenceLine y={0} stroke={theme.palette.divider} strokeWidth={2} />
          <Bar 
            dataKey="balance" 
            shape={renderCustomBar}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AccountBalanceChart; 