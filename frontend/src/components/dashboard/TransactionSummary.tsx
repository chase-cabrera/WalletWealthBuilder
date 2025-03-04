import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Divider, CircularProgress } from '@mui/material';
import { ArrowUpward as IncomeIcon, ArrowDownward as ExpenseIcon } from '@mui/icons-material';
import { Transaction } from '../../services/transactionService';
import transactionService from '../../services/transactionService';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface TransactionSummaryProps {
  transactions?: Transaction[];
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ transactions }) => {
  const [loading, setLoading] = useState(false);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const dataFetchedRef = useRef(false);
  
  useEffect(() => {
    // If transactions are provided as props, use them directly
    if (transactions && transactions.length > 0) {
      processTransactionData(transactions);
      return;
    }
    
    // Only fetch data if we don't have transactions and haven't fetched before
    if (!dataFetchedRef.current) {
      const fetchData = async () => {
        setLoading(true);
        try {
          // Fetch transactions for the current month
          const now = new Date();
          const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
          const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
          
          const transactionsToProcess = await transactionService.getAll({
            startDate,
            endDate
          });
          
          processTransactionData(transactionsToProcess.data);
          dataFetchedRef.current = true;
        } catch (error) {
          console.error('Error fetching transaction summary data:', error);
          // Set zeros if there's an error
          setIncome(0);
          setExpenses(0);
          setBalance(0);
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [transactions]);
  
  const processTransactionData = (transactionsToProcess: Transaction[]) => {
    let totalIncome = 0;
    let totalExpenses = 0;
    
    transactionsToProcess.forEach(transaction => {
      if (transaction.amount > 0) {
        totalIncome += transaction.amount;
      } else {
        totalExpenses += Math.abs(transaction.amount);
      }
    });
    
    setIncome(totalIncome);
    setExpenses(totalExpenses);
    setBalance(totalIncome - totalExpenses);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IncomeIcon sx={{ color: 'success.main', mr: 1 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Income
          </Typography>
          <Typography variant="h6" color="success.main">
            {formatCurrency(income)}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ExpenseIcon sx={{ color: 'error.main', mr: 1 }} />
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Expenses
          </Typography>
          <Typography variant="h6" color="error.main">
            {formatCurrency(expenses)}
          </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Net Balance
          </Typography>
          <Typography 
            variant="h5" 
            color={balance >= 0 ? 'success.main' : 'error.main'}
            fontWeight="medium"
          >
            {formatCurrency(balance)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TransactionSummary; 