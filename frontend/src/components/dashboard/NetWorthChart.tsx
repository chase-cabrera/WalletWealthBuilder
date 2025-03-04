import React, { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import accountService, { Account } from '../../services/accountService';
import transactionService, { Transaction, getTransactionsForNetWorth } from '../../services/transactionService';
import axios from 'axios';
import { API_URL } from '../../config';

interface NetWorthChartProps {
  accounts?: Account[];
  months?: number;
  height?: number | string;
}

interface NetWorthData {
  date: string;
  netWorth: number;
  formattedDate: string;
}

const NetWorthChart: React.FC<NetWorthChartProps> = ({ accounts, months = 12, height = '100%' }) => {
  const [loading, setLoading] = useState(true);
  const [netWorthData, setNetWorthData] = useState<NetWorthData[]>([]);
  const [currentNetWorth, setCurrentNetWorth] = useState(0);
  const [netWorthChange, setNetWorthChange] = useState({ value: 0, percentage: 0 });
  const [usingSampleData, setUsingSampleData] = useState(false);
  const theme = useTheme();

  // Generate sample data function (moved outside useEffect and memoized with useCallback)
  const generateSampleData = useCallback(() => {
    const today = new Date();
    const sampleData: NetWorthData[] = [];
    
    // Start with a base net worth - fixed value for sample data
    let netWorth = 3000;
    
    // Generate data for each month with consistent random seed
    for (let i = months; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      
      // Use a deterministic "random" change based on the month number
      // This ensures the sample data is consistent across renders
      const monthSeed = (i * 17) % 100 / 100; // Value between 0 and 1
      const randomChange = (monthSeed * 0.08 - 0.02) * netWorth;
      netWorth += randomChange;
      
      sampleData.push({
        date: format(monthDate, 'yyyy-MM-dd'),
        netWorth: Math.max(0, netWorth), // Ensure net worth doesn't go negative
        formattedDate: format(monthDate, 'MMM yyyy')
      });
    }
    
    setNetWorthData(sampleData);
    setCurrentNetWorth(sampleData[sampleData.length - 1].netWorth);
    
    // Calculate change
    const oldestValue = sampleData[0].netWorth;
    const newestValue = sampleData[sampleData.length - 1].netWorth;
    const change = newestValue - oldestValue;
    const percentChange = (change / oldestValue) * 100;
    
    setNetWorthChange({
      value: change,
      percentage: percentChange
    });
    
    setUsingSampleData(true);
    setLoading(false);
  }, [months]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchNetWorthData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        // Get current accounts to check if we have any
        let accountsData = accounts || await accountService.getAll();

        // Check if we have any accounts
        if (!accountsData || accountsData.length === 0) {
          // No accounts, use sample data
          generateSampleData();
          return;
        }

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          generateSampleData();
          return;
        }

        // Fetch net worth trend data from the backend API
        const response = await axios.get(`${API_URL}/reports/net-worth-trend?months=${months}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!isMounted) return;

        console.log('Net worth data from API:', response.data);

        // If no data returned, use sample data
        if (!response.data || response.data.length === 0) {
          console.log('No data returned from API, using sample data');
          generateSampleData();
          return;
        }

        // Format the data for the chart
        const formattedData = response.data.map((item: { month: string; value: number }) => ({
          date: item.month + '-01', // Add day to make it a valid date
          netWorth: item.value,
          formattedDate: format(parseISO(item.month + '-01'), 'MMM yyyy')
        }));

        console.log('Formatted data for chart:', formattedData);

        setNetWorthData(formattedData);
        
        // Set current net worth from the most recent data point
        const mostRecent = formattedData[formattedData.length - 1];
        setCurrentNetWorth(mostRecent.netWorth);
        
        // Calculate change
        if (formattedData.length >= 2) {
          const oldestValue = formattedData[0].netWorth;
          const newestValue = formattedData[formattedData.length - 1].netWorth;
          const change = newestValue - oldestValue;
          const percentChange = oldestValue !== 0 ? (change / oldestValue) * 100 : 0;
          
          setNetWorthChange({
            value: change,
            percentage: percentChange
          });
        }
        
        setUsingSampleData(false);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching net worth data:', error);
        if (isMounted) {
          // Fallback to sample data
          generateSampleData();
        }
      }
    };

    fetchNetWorthData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [accounts, months, generateSampleData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 1
          }}
        >
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="body2" color="text.secondary">
            Net Worth: {formatCurrency(payload[0].value)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  // Check if trend is positive
  const isPositiveTrend = netWorthChange.value >= 0;
  
  // Use sample data if no real data is available
  const dataToDisplay = netWorthData.length > 0 ? netWorthData : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Find the minimum and maximum values for the Y-axis domain
  const minNetWorth = Math.min(...dataToDisplay.map(item => item.netWorth));
  const maxNetWorth = Math.max(...dataToDisplay.map(item => item.netWorth));
  
  // Ensure we have a valid domain even if there's no data
  const yAxisDomain = dataToDisplay.length > 0 
    ? [Math.max(0, minNetWorth * 0.9), maxNetWorth * 1.1] 
    : [0, 100];

  return (
    <Box sx={{ width: '100%', height: height, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="text.primary">
            {formatCurrency(currentNetWorth)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Typography 
              variant="body2" 
              color={isPositiveTrend ? 'success.main' : 'error.main'}
              fontWeight="medium"
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              {isPositiveTrend ? '↑' : '↓'} {formatCurrency(Math.abs(netWorthChange.value))} ({netWorthChange.percentage.toFixed(1)}%)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              Past {months} months
            </Typography>
          </Box>
        </Box>
        {usingSampleData && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Sample Data
          </Typography>
        )}
      </Box>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={dataToDisplay}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 30, // Increased bottom margin to make room for x-axis labels
          }}
        >
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={isPositiveTrend ? theme.palette.success.main : theme.palette.error.main} 
                stopOpacity={0.8}
              />
              <stop 
                offset="95%" 
                stopColor={isPositiveTrend ? theme.palette.success.main : theme.palette.error.main} 
                stopOpacity={0.1}
              />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke={theme.palette.divider}
          />
          <XAxis 
            dataKey="formattedDate" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            dy={10}
            height={30} // Explicitly set height for the x-axis
            interval="preserveStartEnd" // Show first and last labels, plus some in between
            tickMargin={10} // Add margin between ticks and axis
          />
          <YAxis 
            tickFormatter={formatCurrency} 
            axisLine={false}
            tickLine={false}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            dx={-10}
            width={60} // Explicitly set width for the y-axis
            domain={yAxisDomain} // Set the domain to ensure no negative values
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="netWorth" 
            stroke={isPositiveTrend ? theme.palette.success.main : theme.palette.error.main} 
            fillOpacity={1}
            fill="url(#netWorthGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default NetWorthChart; 