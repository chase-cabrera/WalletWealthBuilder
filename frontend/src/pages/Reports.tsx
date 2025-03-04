import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Grid, Container, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel, SelectChangeEvent, Button } from '@mui/material';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { API_URL } from '../config';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

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

const Reports: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<any>(null);
  const [incomeExpenseData, setIncomeExpenseData] = useState<any>(null);
  const [netWorthData, setNetWorthData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<number>(6);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  
  const reportsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Fetch spending by category data
      const spendingResponse = await axios.get(`${API_URL}/reports/spending-by-category?months=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch income vs expenses data
      const incomeExpenseResponse = await axios.get(`${API_URL}/reports/income-vs-expenses?months=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Fetch net worth trend data
      const netWorthResponse = await axios.get(`${API_URL}/reports/net-worth-trend?months=${timeRange}`, {
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
    
    // Get the most recent month
    const months = Object.keys(data).sort();
    const latestMonth = months[months.length - 1];
    
    if (latestMonth && data[latestMonth]) {
      // Create pie chart data for the latest month
      const categories = Object.entries(data[latestMonth])
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
    }
    
    return formattedData;
  };

  const formatIncomeExpenseData = (data: any) => {
    // Format data for the income vs expenses chart
    return Object.entries(data).map(([month, values]: [string, any]) => ({
      name: month,
      Income: values.INCOME || 0,
      Expenses: values.EXPENSE || 0,
      Savings: (values.INCOME || 0) - (values.EXPENSE || 0)
    }));
  };

  const formatNetWorthData = (data: any) => {
    // Format data for the net worth trend chart
    return Object.entries(data).map(([month, value]: [string, any]) => ({
      name: month,
      'Net Worth': value
    }));
  };

  const handleTimeRangeChange = (event: SelectChangeEvent<number>) => {
    setTimeRange(event.target.value as number);
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Financial Reports
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="time-range-label">Time Range</InputLabel>
            <Select
              labelId="time-range-label"
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value={3}>3 Months</MenuItem>
              <MenuItem value={6}>6 Months</MenuItem>
              <MenuItem value={12}>12 Months</MenuItem>
            </Select>
          </FormControl>
          
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
                Spending by Category (Latest Month)
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
                      >
                        {spendingData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend layout="vertical" verticalAlign="middle" align="right" />
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={incomeExpenseData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Income" fill="#00C49F" />
                      <Bar dataKey="Expenses" fill="#FF8042" />
                      <Bar dataKey="Savings" fill="#0088FE" />
                    </BarChart>
                  </ResponsiveContainer>
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
                      <Tooltip formatter={(value) => `$${value}`} />
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