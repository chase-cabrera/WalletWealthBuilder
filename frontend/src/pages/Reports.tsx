import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Grid, Container, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent, Button } from '@mui/material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { API_URL } from '../config';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import IncomeVsExpensesChart from '../components/reports/IncomeVsExpensesChart';

// Define chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

// Add the type definition for jsPDF with autoTable
declare global {
  interface Window {
    html2canvas: any;
  }
}

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// Add a utility function for formatting currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const Reports: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<any>(null);
  const [incomeExpenseData, setIncomeExpenseData] = useState<any>(null);
  const [netWorthData, setNetWorthData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<string>("6");
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  
  const reportsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async (startDate?: Date, endDate?: Date) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Use the provided dates or calculate based on timeRange
      let months = timeRange;
      if (!startDate && !endDate) {
        // If no dates provided, use the timeRange value
        if (timeRange !== 'this-month' && timeRange !== 'last-month') {
          months = timeRange; // Use the numeric string value
        } else {
          // For 'this-month' and 'last-month', default to 1 month
          months = "1";
        }
      }
      
      // Construct the API URL with appropriate parameters
      let url = `${API_URL}/reports/spending-by-category`;
      if (startDate && endDate) {
        // If dates are provided, use them as query parameters
        url += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      } else {
        // Otherwise use months parameter
        url += `?months=${months}`;
      }
      
      // Fetch spending by category data
      const spendingResponse = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch income vs expenses data
      let incomeExpenseUrl = `${API_URL}/reports/income-vs-expenses`;
      if (startDate && endDate) {
        incomeExpenseUrl += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      } else {
        incomeExpenseUrl += `?months=${months}`;
      }
      const incomeExpenseResponse = await axios.get(incomeExpenseUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch net worth trend data
      let netWorthUrl = `${API_URL}/reports/net-worth-trend`;
      if (startDate && endDate) {
        netWorthUrl += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      } else {
        netWorthUrl += `?months=${months}`;
      }
      const netWorthResponse = await axios.get(netWorthUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSpendingData(formatSpendingData(spendingResponse.data));
      setIncomeExpenseData(formatIncomeExpenseData(incomeExpenseResponse.data));
      setNetWorthData(formatNetWorthData(netWorthResponse.data));
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data. Please try again later.');
      setLoading(false);
    }
  };

  const formatSpendingData = (data: any) => {
    // Format data for the spending by category chart
    const formattedData: any[] = [];
    
    // For 'this-month' or 'last-month', use the only month in the data
    // For other time ranges, use the aggregated data across all months
    let categoryTotals: Record<string, number> = {};
    
    if (timeRange === 'this-month' || timeRange === 'last-month') {
      // Get the most recent month
      const months = Object.keys(data).sort();
      const latestMonth = months[months.length - 1];
      
      if (latestMonth && data[latestMonth]) {
        categoryTotals = data[latestMonth];
      }
    } else {
      // Aggregate spending across all months in the range
      Object.values(data).forEach((monthData: any) => {
        Object.entries(monthData).forEach(([category, amount]: [string, any]) => {
          categoryTotals[category] = (categoryTotals[category] || 0) + Number(amount);
        });
      });
    }
    
    // Create pie chart data from the category totals
    const categories = Object.entries(categoryTotals)
      .map(([category, amount]: [string, any]) => ({ 
        category, 
        amount: Number(amount) 
      }))
      .sort((a, b) => b.amount - a.amount);
    
    // Take top 8 categories
    const topCategories = categories.slice(0, 8);
    
    // Sum the rest as "Other"
    const otherCategories = categories.slice(8);
    const otherTotal = otherCategories.reduce((sum, item) => sum + item.amount, 0);
    
    // Add top categories to chart data
    topCategories.forEach((item, index) => {
      formattedData.push({
        name: item.category,
        value: item.amount,
        color: COLORS[index % COLORS.length]
      });
    });
    
    // Add "Other" category if there are more than 8 categories
    if (otherCategories.length > 0) {
      formattedData.push({
        name: 'Other',
        value: otherTotal,
        color: COLORS[8 % COLORS.length]
      });
    }
    
    return formattedData;
  };

  const formatIncomeExpenseData = (data: any) => {
    // Get the date range based on the selected timeRange
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
    
    if (timeRange === 'this-month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (timeRange === 'last-month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      // For numeric values (3, 6, 12 months)
      const months = parseInt(timeRange, 10);
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - months + 1);
      startDate.setDate(1); // First day of the month
    }
    
    // Create an array of all months in the range
    const allMonths: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      allMonths.push(format(currentDate, 'yyyy-MM'));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Format data for the income vs expenses chart
    const formattedData = Object.entries(data).map(([month, values]: [string, any]) => {
      // Parse the month string to a Date object
      const monthDate = new Date(month);
      
      return {
        // Format the month to show the correct month name and year
        name: format(monthDate, 'yyyy-MM'),
        Income: values.INCOME || 0,
        Expenses: values.EXPENSE || 0,
        Savings: (values.INCOME || 0) - (values.EXPENSE || 0)
      };
    });
    
    // Create a map of existing data
    const dataMap = formattedData.reduce((acc, item) => {
      acc[item.name] = item;
      return acc;
    }, {} as Record<string, any>);
    
    // Create the final data array with all months
    const completeData = allMonths.map(month => {
      if (dataMap[month]) {
        return dataMap[month];
      } else {
        return {
          name: month,
          Income: 0,
          Expenses: 0,
          Savings: 0
        };
      }
    });
    
    // Sort by date to ensure chronological order
    completeData.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    
    return completeData;
  };

  const formatNetWorthData = (data: any) => {
    // Format data for the net worth trend chart
    const formattedData = Object.entries(data).map(([month, value]: [string, any]) => ({
      name: month,
      'Net Worth': value
    }));
    
    // If timeRange is 'this-month' or 'last-month', ensure we only show one month
    if (timeRange === 'this-month' || timeRange === 'last-month') {
      if (formattedData.length > 1) {
        return [formattedData[formattedData.length - 1]];
      }
    }
    
    return formattedData;
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setTimeRange(value);
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    
    if (value === 'this-month') {
      // First day of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      // Last day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      fetchReportData(startDate, endDate);
      return;
    } else if (value === 'last-month') {
      // First day of previous month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Last day of previous month
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      fetchReportData(startDate, endDate);
      return;
    } else {
      // For numeric values (3, 6, 12 months)
      const months = parseInt(value, 10);
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - months);
      
      // For 3, 6, 12 months, use today as the end date
      fetchReportData(startDate, now);
      return;
    }
  };

  const handleExportPDF = async () => {
    if (!reportsRef.current) return;
    
    setExportLoading(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const title = "Financial Reports";
      const timeRangeText = `Time Range: ${timeRange} Months`;
      const date = new Date().toLocaleDateString();
      
      // Add title
      pdf.setFontSize(20);
      pdf.text(title, 105, 15, { align: 'center' });
      
      // Add metadata
      pdf.setFontSize(10);
      pdf.text(timeRangeText, 105, 22, { align: 'center' });
      pdf.text(`Generated on: ${date}`, 105, 27, { align: 'center' });
      
      // Capture and add spending chart
      if (spendingData && spendingData.length > 0) {
        const spendingElement = document.getElementById('spending-chart');
        if (spendingElement) {
          const spendingCanvas = await html2canvas(spendingElement);
          const spendingImgData = spendingCanvas.toDataURL('image/png');
          pdf.text('Spending by Category (Latest Month)', 105, 40, { align: 'center' });
          pdf.addImage(spendingImgData, 'PNG', 15, 45, 180, 70);
          
          // Add spending data as simple text
          pdf.text('Spending Details:', 15, 125);
          
          let yPos = 135;
          spendingData.forEach((item: any, index: number) => {
            pdf.text(`${item.name}: $${item.value.toFixed(2)}`, 20, yPos);
            yPos += 7;
          });
        }
      }
      
      // Add page break
      pdf.addPage();
      
      // Capture and add income vs expenses chart
      if (incomeExpenseData && incomeExpenseData.length > 0) {
        const incomeElement = document.getElementById('income-chart');
        if (incomeElement) {
          const incomeCanvas = await html2canvas(incomeElement);
          const incomeImgData = incomeCanvas.toDataURL('image/png');
          pdf.text('Income vs Expenses', 105, 15, { align: 'center' });
          pdf.addImage(incomeImgData, 'PNG', 15, 20, 180, 70);
          
          // Add income/expense data as simple text
          pdf.text('Monthly Income & Expenses:', 15, 100);
          
          let yPos = 110;
          incomeExpenseData.forEach((item: any, index: number) => {
            pdf.text(`${item.name}:`, 20, yPos);
            pdf.text(`Income: $${item.Income.toFixed(2)}`, 30, yPos + 7);
            pdf.text(`Expenses: $${item.Expenses.toFixed(2)}`, 30, yPos + 14);
            pdf.text(`Savings: $${item.Savings.toFixed(2)}`, 30, yPos + 21);
            yPos += 30;
            
            // Add page break if needed
            if (yPos > 250 && index < incomeExpenseData.length - 1) {
              pdf.addPage();
              yPos = 20;
            }
          });
        }
      }
      
      // Add page break
      pdf.addPage();
      
      // Capture and add net worth chart
      if (netWorthData && netWorthData.length > 0) {
        const netWorthElement = document.getElementById('networth-chart');
        if (netWorthElement) {
          const netWorthCanvas = await html2canvas(netWorthElement);
          const netWorthImgData = netWorthCanvas.toDataURL('image/png');
          pdf.text('Net Worth Trend', 105, 15, { align: 'center' });
          pdf.addImage(netWorthImgData, 'PNG', 15, 20, 180, 70);
          
          // Add net worth data as simple text
          pdf.text('Monthly Net Worth:', 15, 100);
          
          let yPos = 110;
          netWorthData.forEach((item: any) => {
            pdf.text(`${item.name}: $${item['Net Worth'].toFixed(2)}`, 20, yPos);
            yPos += 7;
          });
        }
      }
      
      // Save the PDF
      pdf.save('financial-reports.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setExportLoading(false);
    }
  };

  // Add a function to format the date range display
  const getTimeRangeDisplay = (): string => {
    const now = new Date();
    
    if (timeRange === 'this-month') {
      const monthName = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();
      return `${monthName} ${year}`;
    } else if (timeRange === 'last-month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthName = lastMonth.toLocaleString('default', { month: 'long' });
      const year = lastMonth.getFullYear();
      return `${monthName} ${year}`;
    } else {
      // For numeric values (3, 6, 12 months)
      const months = parseInt(timeRange, 10);
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - months);
      
      const startMonth = startDate.toLocaleString('default', { month: 'short' });
      const startYear = startDate.getFullYear();
      const endMonth = now.toLocaleString('default', { month: 'short' });
      const endYear = now.getFullYear();
      
      if (startYear === endYear) {
        return `${startMonth} - ${endMonth} ${endYear}`;
      } else {
        return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
      }
    }
  };

  // Add a handler for category click
  const handleCategoryClick = (category: string) => {
    // Get date range based on current timeRange
    const now = new Date();
    let startDate: string;
    let endDate: string;
    
    if (timeRange === 'this-month') {
      // First day of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      // Last day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (timeRange === 'last-month') {
      // First day of previous month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      // Last day of previous month
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    } else {
      // For numeric values (3, 6, 12 months)
      const months = parseInt(timeRange, 10);
      startDate = new Date(now.getFullYear(), now.getMonth() - months, 1).toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }
    
    // Navigate to transactions page with filters
    navigate(`/transactions?startDate=${startDate}&endDate=${endDate}&category=${encodeURIComponent(category)}`);
  };

  if (loading) {
    return (
      <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 }, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Financial Reports {getTimeRangeDisplay()}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {getTimeRangeDisplay()}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">Time Range:</Typography>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="this-month">This Month</MenuItem>
              <MenuItem value="last-month">Last Month</MenuItem>
              <MenuItem value="3">3 Months</MenuItem>
              <MenuItem value="6">6 Months</MenuItem>
              <MenuItem value="12">12 Months</MenuItem>
            </Select>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<FileDownloadIcon />}
            onClick={handleExportPDF}
            disabled={exportLoading}
          >
            {exportLoading ? 'Generating...' : 'Export PDF'}
          </Button>
        </Box>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}
      
      <div ref={reportsRef}>
        <Grid container spacing={4}>
          {/* Spending by Category */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                {timeRange === 'this-month' 
                  ? 'Spending by Category (This Month)'
                  : timeRange === 'last-month'
                    ? 'Spending by Category (Last Month)'
                    : `Spending by Category (Last ${timeRange} Months)`}
              </Typography>
              
              {spendingData && spendingData.length > 0 ? (
                <Box sx={{ height: 400 }} id="spending-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        outerRadius={100}
                        innerRadius={40}
                        paddingAngle={2}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(data) => handleCategoryClick(data.name)}
                        cursor="pointer"
                      >
                        {spendingData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)} 
                        labelFormatter={(name) => `${name}`}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        onClick={(data) => handleCategoryClick(data.value)}
                        formatter={(value) => <span style={{ cursor: 'pointer' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No spending data available for the selected time period.
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Income vs Expenses */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Income vs Expenses
              </Typography>
              
              {incomeExpenseData && incomeExpenseData.length > 0 ? (
                <Box sx={{ height: 400 }} id="income-chart">
                  <IncomeVsExpensesChart data={incomeExpenseData} />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No income/expense data available for the selected time period.
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Net Worth Trend */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Net Worth Trend
              </Typography>
              
              {netWorthData && netWorthData.length > 0 ? (
                <Box sx={{ height: 400 }} id="networth-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={netWorthData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value as number)} 
                        labelFormatter={(name) => `${name}`}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="Net Worth" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No net worth data available for the selected time period.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </div>
    </Container>
  );
};

export default Reports; 