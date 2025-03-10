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
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  Chip,
  Menu,
} from '@mui/material';
import { Add as AddIcon, FileDownload as FileDownloadIcon, FileUpload as FileUploadIcon, DeleteForever as DeleteForeverIcon, MoreVert as MoreIcon, Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
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
import { useLocation } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import categoryService from '../services/categoryService';
import type { Category as CategoryType } from '../services/transactionService';

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
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Transaction>>({});
  const [categories, setCategories] = useState<CategoryType[]>([]);
  
  const theme = useTheme();
  const location = useLocation();

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

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoryService.getAll();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchTransactions(1);
    fetchCategories();
  }, [fetchAccounts, fetchTransactions, fetchCategories]);

  useEffect(() => {
    try {
      // Parse query parameters
      const params = new URLSearchParams(location.search);
      const startDate = params.get('startDate');
      const endDate = params.get('endDate');
      const category = params.get('category');
      
      // If we have parameters, set filters and fetch transactions
      if (startDate || endDate || category) {
        const newFilters: TransactionQuery = { ...filters };
        
        if (startDate) newFilters.startDate = startDate;
        if (endDate) newFilters.endDate = endDate;
        if (category) newFilters.category = category;
        
        // Make sure we don't have any NaN values
        Object.keys(newFilters).forEach(key => {
          const k = key as keyof TransactionQuery;
          if (newFilters[k] === 'NaN' || Number.isNaN(newFilters[k])) {
            delete newFilters[k];
          }
        });
        
        setFilters(newFilters);
        fetchTransactions(1, newFilters);
      }
    } catch (error) {
      console.error('Error parsing URL parameters:', error);
    }
  }, [location.search]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchTransactions(value);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdd = async (data: CreateTransactionDto | Partial<Transaction>) => {
    try {
      // Convert Partial<Transaction> to CreateTransactionDto if needed
      const transactionData: CreateTransactionDto = {
        amount: data.amount ?? 0,
        description: data.description ?? '',
        vendor: data.vendor ?? '',
        purchaser: data.purchaser ?? '',
        note: data.note ?? '',
        date: data.date ?? format(new Date(), 'yyyy-MM-dd'),
        type: (data.type as 'INCOME' | 'EXPENSE') ?? 'EXPENSE',
        category: data.category ?? 'Uncategorized',
        accountId: data.accountId
      };
      
      await transactionService.create(transactionData);
      fetchTransactions();
      setIsFormOpen(false);
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

  const handleImportSuccess = () => {
    fetchTransactions();
    setSnackbar({
      open: true,
      message: 'Transactions imported successfully',
      severity: 'success'
    });
  };

  const handleImportError = (message: string) => {
    setSnackbar({
      open: true,
      message,
      severity: 'error'
    });
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

  const handleDeleteAllTransactions = async () => {
    setIsDeleting(true);
    try {
      await transactionService.deleteAll();
      // Refresh the transactions list
      fetchTransactions();
      // Show success message
      setSnackbar({
        open: true,
        message: 'All transactions deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting all transactions:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete all transactions',
        severity: 'error'
      });
    } finally {
      setIsDeleting(false);
      setDeleteAllDialogOpen(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transactionId: number) => {
    setMenuAnchorEl(event.currentTarget);
    setCurrentTransactionId(transactionId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setCurrentTransactionId(null);
  };

  const handleEditTransaction = () => {
    if (currentTransactionId) {
      const transaction = transactions.find(t => t.id === currentTransactionId);
      if (transaction) {
        // Check if the category exists in our categories list
        const categoryExists = categories.some((c: CategoryType) => c.name === transaction.category);
        
        setEditFormData({
          ...transaction,
          // If the category doesn't exist, set it to empty string to avoid the out-of-range error
          category: categoryExists ? transaction.category : '',
        });
        
        setIsEditDialogOpen(true);
      }
    }
    handleMenuClose();
  };

  const handleDeleteTransaction = () => {
    setIsDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDeleteTransaction = async () => {
    if (currentTransactionId) {
      try {
        await transactionService.delete(currentTransactionId);
        fetchTransactions(page);
        setIsDeleteDialogOpen(false);
        showSnackbar('Transaction deleted successfully', 'success');
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        showSnackbar('Failed to delete transaction', 'error');
      }
    }
  };

  const handleSaveEdit = async (data: Partial<Transaction>) => {
    if (currentTransactionId) {
      try {
        await transactionService.update(currentTransactionId, data);
        
        // Update the transactions list
        fetchTransactions(page);
        
        // Show success message
        setSnackbar({
          open: true,
          message: 'Transaction updated successfully',
          severity: 'success'
        });
        
        // Close the edit dialog
        setIsEditDialogOpen(false);
        setCurrentTransactionId(null);
        setEditFormData({});
      } catch (error) {
        console.error('Failed to update transaction:', error);
        setSnackbar({
          open: true,
          message: 'Failed to update transaction',
          severity: 'error'
        });
      }
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = transactions.map(t => t.id);
      setSelectedTransactions(newSelected);
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleSelectTransaction = (id: number) => {
    const selectedIndex = selectedTransactions.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedTransactions, id];
    } else {
      newSelected = selectedTransactions.filter(transactionId => transactionId !== id);
    }

    setSelectedTransactions(newSelected);
  };

  const isSelectedTransaction = (id: number) => selectedTransactions.indexOf(id) !== -1;

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
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        mb: 3 
      }}>
        <Typography variant="h4" component="h1">
          Transactions
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={() => setDeleteAllDialogOpen(true)}
            disabled={loading || transactions.length === 0}
            sx={{ flexGrow: { xs: 1, sm: 0 } }}
          >
            Delete All
          </Button>
          <Box sx={{ flexGrow: { xs: 1, sm: 0 } }}>
            <ImportExportButtons 
              onImportSuccess={handleImportSuccess}
              onError={handleImportError}
              transactions={transactions}
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedTransaction(undefined);
              setIsFormOpen(true);
            }}
            sx={{ flexGrow: { xs: 1, sm: 0 } }}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <TransactionFilters 
          onFilter={handleFilter}
          accounts={accounts}
          initialFilters={filters}
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
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedTransactions.length > 0 && selectedTransactions.length < transactions.length}
                        checked={transactions.length > 0 && selectedTransactions.length === transactions.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => {
                    const isItemSelected = isSelectedTransaction(transaction.id);
                    
                    return (
                      <TableRow
                        key={transaction.id}
                        selected={isItemSelected}
                        hover
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isItemSelected}
                            onClick={() => handleSelectTransaction(transaction.id)}
                          />
                        </TableCell>
                        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.category} 
                            size="small"
                            sx={{ 
                              bgcolor: 'rgba(0, 0, 0, 0.08)',
                              borderRadius: '16px'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          color: transaction.type === 'EXPENSE' ? 'error.main' : 'success.main',
                          fontWeight: 'medium'
                        }}>
                          {transaction.type === 'EXPENSE' ? '↓' : '↑'} {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          {transaction.accountId && accountMap[transaction.accountId] 
                            ? accountMap[transaction.accountId] 
                            : (transaction.account?.name || "No Account")}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            aria-label="more"
                            onClick={(e) => handleMenuOpen(e, transaction.id)}
                          >
                            <MoreIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            
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
            ? (data: any) => handleEdit(selectedTransaction.id, data)
            : handleAdd
          }
          transaction={selectedTransaction}
          accounts={accounts}
        />
      )}
      
      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >
        <DialogTitle>Delete All Transactions</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete all transactions? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteAllDialogOpen(false)} 
            color="inherit"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteAllTransactions} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} color="inherit" /> : <DeleteForeverIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditTransaction}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteTransaction}>
          <DeleteForeverIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
      <Dialog 
        open={isEditDialogOpen} 
        onClose={() => {
          setIsEditDialogOpen(false);
          setCurrentTransactionId(null);
          setEditFormData({});
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Transaction
          <IconButton
            aria-label="close"
            onClick={() => {
              setIsEditDialogOpen(false);
              setCurrentTransactionId(null);
              setEditFormData({});
            }}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TransactionForm
            initialData={editFormData}
            onSubmit={handleSaveEdit}
            onCancel={() => {
              setIsEditDialogOpen(false);
              setCurrentTransactionId(null);
              setEditFormData({});
            }}
            accounts={accounts}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this transaction?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDeleteTransaction} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Transactions; 