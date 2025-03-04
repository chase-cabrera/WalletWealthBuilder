import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Divider,
  useTheme,
  Grid,
  Fab,
  CircularProgress,
  Alert,
  Snackbar,
  Pagination,
  TextField,
  MenuItem
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TransactionList from '../components/transactions/TransactionList';
import TransactionForm from '../components/transactions/TransactionForm';
import TransactionFilters from '../components/transactions/TransactionFilters';
import ImportExportButtons from '../components/transactions/ImportExportButtons';
import transactionService, { 
  Transaction, 
  CreateTransactionDto,
  TransactionQuery
} from '../services/transactionService';
import accountService, { Account } from '../services/accountService';
import { format } from 'date-fns';

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<TransactionQuery>({});
  const [pageSize, setPageSize] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const theme = useTheme();

  // Memoize the account map for better performance
  const accountMap = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc[account.id] = account.name;
      return acc;
    }, {} as Record<number, string>);
  }, [accounts]);

  const fetchTransactions = useCallback(async (pageNum = 1, newFilters?: TransactionQuery) => {
    setLoading(true);
    
    try {
      const currentFilters = newFilters || filters;
      const queryParams: TransactionQuery = {
        ...currentFilters,
        page: pageNum,
        pageSize: pageSize
      };
      
      const result = await transactionService.getAll(queryParams);
      
      setTransactions(result.data);
      setTotalCount(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
      
      console.log(`Loaded ${result.data.length} transactions (page ${result.page} of ${result.totalPages})`);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setError('Failed to load transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  // New function to load more transactions (infinite scroll approach)
  const loadMoreTransactions = useCallback(async () => {
    if (page >= totalPages || isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = page + 1;
      const queryParams: TransactionQuery = {
        ...filters,
        page: nextPage,
        pageSize: pageSize
      };
      
      const result = await transactionService.getAll(queryParams);
      
      // Append new transactions to existing ones
      setTransactions(prevTransactions => [...prevTransactions, ...result.data]);
      setTotalCount(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
      
      console.log(`Loaded ${result.data.length} more transactions (page ${result.page} of ${result.totalPages})`);
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filters, page, totalPages, pageSize, isLoadingMore]);

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountService.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions(1);
  }, [fetchAccounts, fetchTransactions]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchTransactions(value);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdd = async (data: CreateTransactionDto) => {
    try {
      await transactionService.create(data);
      setIsFormOpen(false);
      fetchTransactions(1);
      showSnackbar('Transaction added successfully', 'success');
    } catch (error) {
      console.error('Failed to add transaction:', error);
      showSnackbar('Failed to add transaction', 'error');
    }
  };

  const handleEdit = async (id: number, data: Partial<CreateTransactionDto>) => {
    try {
      await transactionService.update(id, data);
      setIsFormOpen(false);
      setSelectedTransaction(undefined);
      fetchTransactions(page);
      showSnackbar('Transaction updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update transaction:', error);
      showSnackbar('Failed to update transaction', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await transactionService.delete(id);
      fetchTransactions(page);
      showSnackbar('Transaction deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      showSnackbar('Failed to delete transaction', 'error');
    }
  };

  const handleBatchUpdate = async (ids: number[], updates: Partial<Transaction>) => {
    try {
      const updateData: Partial<CreateTransactionDto> = {
        ...(updates.amount !== undefined && { amount: updates.amount }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.vendor !== undefined && { vendor: updates.vendor }),
        ...(updates.purchaser !== undefined && { purchaser: updates.purchaser }),
        ...(updates.note !== undefined && { note: updates.note }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.date !== undefined && { date: updates.date }),
        ...(updates.accountId !== undefined && { accountId: updates.accountId }),
        ...(updates.type === 'INCOME' || updates.type === 'EXPENSE' ? { type: updates.type as 'INCOME' | 'EXPENSE' } : {})
      };
      
      await Promise.all(ids.map(id => transactionService.update(id, updateData)));
      fetchTransactions(page);
      showSnackbar(`${ids.length} transactions updated successfully`, 'success');
    } catch (error) {
      console.error('Failed to update transactions:', error);
      showSnackbar('Failed to update transactions', 'error');
    }
  };

  const handleFilter = (newFilters: TransactionQuery) => {
    setFilters(newFilters);
    setPage(1);
    fetchTransactions(1, newFilters);
  };

  const handleImportData = async (importedData: any[]) => {
    try {
      setLoading(true);
      const result = await transactionService.importFromCSV(importedData);
      
      if (result.success > 0) {
        showSnackbar(`Successfully imported ${result.success} transactions`, 'success');
        fetchTransactions(1);
      } else {
        showSnackbar('Failed to import any transactions', 'error');
      }
    } catch (error) {
      console.error('Failed to import transactions:', error);
      showSnackbar('Failed to import transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newSize = parseInt(event.target.value, 10);
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
    fetchTransactions(1, filters);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Transactions
        </Typography>
        <Box>
          <ImportExportButtons 
            onImport={handleImportData} 
            transactions={transactions}
          />
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedTransaction(undefined);
              setIsFormOpen(true);
            }}
            sx={{ ml: 2 }}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <TransactionFilters 
          onFilter={handleFilter}
          accounts={accounts}
        />
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ width: '100%', mb: 3 }}>
        {loading && transactions.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TransactionList 
              transactions={transactions}
              onEdit={(transaction) => {
                setSelectedTransaction(transaction);
                setIsFormOpen(true);
              }}
              onDelete={handleDelete}
              onBatchUpdate={handleBatchUpdate}
              accounts={accountMap}
            />
            
            {totalPages > 1 && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                borderTop: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                    Rows per page:
                  </Typography>
                  <TextField
                    select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    variant="outlined"
                    size="small"
                    sx={{ width: 100, mr: 2 }}
                  >
                    {[10, 25, 50, 100, 500, 1000].map((size) => (
                      <MenuItem key={size} value={size}>
                        {size}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Typography variant="body2" color="text.secondary">
                    Page {page} of {totalPages} ({totalCount} total transactions)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button 
                    disabled={page <= 1}
                    onClick={() => handlePageChange({} as React.ChangeEvent<unknown>, 1)}
                    sx={{ minWidth: 'auto', mr: 1 }}
                  >
                    First
                  </Button>
                  <Button 
                    disabled={page <= 1}
                    onClick={() => handlePageChange({} as React.ChangeEvent<unknown>, page - 1)}
                    sx={{ minWidth: 'auto', mr: 1 }}
                  >
                    Prev
                  </Button>
                  <Pagination 
                    count={totalPages} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary"
                    siblingCount={1}
                    boundaryCount={1}
                    size="medium"
                    hidePrevButton
                    hideNextButton
                  />
                  <Button 
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange({} as React.ChangeEvent<unknown>, page + 1)}
                    sx={{ minWidth: 'auto', ml: 1 }}
                  >
                    Next
                  </Button>
                  <Button 
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange({} as React.ChangeEvent<unknown>, totalPages)}
                    sx={{ minWidth: 'auto', ml: 1 }}
                  >
                    Last
                  </Button>
                </Box>
              </Box>
            )}
            
            {totalPages <= 1 && (
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'flex-end',
                borderTop: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default
              }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {transactions.length} of {totalCount} transactions
                </Typography>
              </Box>
            )}
            
            {/* Load More Button (Alternative to pagination) */}
            {totalPages > 1 && page < totalPages && (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                p: 2,
                borderTop: `1px solid ${theme.palette.divider}`
              }}>
                <Button 
                  variant="outlined" 
                  onClick={loadMoreTransactions}
                  disabled={isLoadingMore}
                  startIcon={isLoadingMore ? <CircularProgress size={20} /> : null}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Transactions'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Paper>
      
      {isFormOpen && (
        <TransactionForm 
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedTransaction(undefined);
          }}
          onSubmit={selectedTransaction 
            ? (data) => handleEdit(selectedTransaction.id, data)
            : handleAdd
          }
          transaction={selectedTransaction}
          accounts={accounts}
        />
      )}
    </Box>
  );
};

export default Transactions; 