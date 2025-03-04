import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TablePagination,
  Checkbox,
  Toolbar,
  Button,
  Tooltip,
  alpha,
  Collapse,
  useTheme,
  Grid,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  ArrowUpward as IncomeIcon,
  ArrowDownward as ExpenseIcon,
  FilterList as FilterIcon,
  Category as CategoryIcon,
  AccountBalance as AccountIcon,
  DeleteSweep as DeleteMultipleIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Person as PersonIcon,
  Store as VendorIcon,
  Note as NoteIcon,
  SwapVert as SwapVertIcon,
} from '@mui/icons-material';
import { Transaction } from '../../services/transactionService';
import { format, parseISO } from 'date-fns';

interface TransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  isExpanded: boolean;
  accounts: Record<number, string>;
  handleSelectClick: (event: React.MouseEvent<unknown>, id: number) => void;
  handleRowExpand: (id: number) => void;
  handleMenuOpen: (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => void;
  getAmountColor: (transaction: Transaction) => string;
  getAmountIcon: (transaction: Transaction) => JSX.Element;
  formatCurrency: (amount: number) => string;
  getCategoryDisplayName: (transaction: Transaction) => string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  onBatchUpdate?: (ids: number[], updates: Partial<Transaction>) => void;
  accounts: Record<number, string>;
}

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Housing',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Personal Care',
  'Education',
  'Travel',
  'Gifts & Donations',
  'Business',
  'Income',
  'Taxes',
  'Transfer',
  'Other'
];

// Create a memoized transaction row component to improve performance with large datasets
const TransactionRow = React.memo(({ 
  transaction, 
  isSelected, 
  isExpanded, 
  accounts,
  handleSelectClick,
  handleRowExpand,
  handleMenuOpen,
  getAmountColor,
  getAmountIcon,
  formatCurrency,
  getCategoryDisplayName
}: TransactionRowProps) => {
  return (
    <>
      <TableRow
        hover
        onClick={(event) => handleSelectClick(event, transaction.id)}
        role="checkbox"
        aria-checked={isSelected}
        tabIndex={-1}
        selected={isSelected}
        sx={{ cursor: 'pointer' }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            checked={isSelected}
            inputProps={{
              'aria-labelledby': `enhanced-table-checkbox-${transaction.id}`,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
        <TableCell component="th" scope="row">
          {format(new Date(transaction.date), 'MMM d, yyyy')}
        </TableCell>
        <TableCell>{transaction.description}</TableCell>
        <TableCell>
          <Chip 
            label={getCategoryDisplayName(transaction)} 
            size="small" 
            color={transaction.type === 'INCOME' ? 'success' : 'default'}
          />
        </TableCell>
        <TableCell align="right" sx={{ color: getAmountColor(transaction) }}>
          {getAmountIcon(transaction)}
          {formatCurrency(Math.abs(transaction.amount))}
        </TableCell>
        <TableCell>
          {transaction.accountId && accounts[transaction.accountId] 
            ? accounts[transaction.accountId] 
            : 'No Account'}
        </TableCell>
        <TableCell align="right">
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleRowExpand(transaction.id);
            }}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
          <IconButton
            aria-label="transaction menu"
            size="small"
            onClick={(e) => handleMenuOpen(e, transaction)}
          >
            <MoreIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Grid container spacing={2} sx={{ py: 1 }}>
                {transaction.vendor && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <VendorIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" component="span">
                        Vendor:
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {transaction.vendor}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {transaction.purchaser && (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" component="span">
                        Purchaser:
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {transaction.purchaser}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {transaction.note && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <NoteIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary" component="span">
                        Note:
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {transaction.note}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
});

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  onBatchUpdate,
  accounts,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [batchMenuAnchorEl, setBatchMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [categoryMenuAnchorEl, setCategoryMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [accountMenuAnchorEl, setAccountMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const theme = useTheme();

  console.log('Transactions received by component:', transactions.length);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleEdit = () => {
    if (selectedTransaction) {
      onEdit(selectedTransaction);
      handleMenuClose();
    }
  };

  const handleDelete = () => {
    if (selectedTransaction) {
      if (window.confirm('Are you sure you want to delete this transaction?')) {
        onDelete(selectedTransaction.id);
      }
      handleMenuClose();
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = transactions.map(t => t.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelectClick = (event: React.MouseEvent<unknown>, id: number) => {
    event.stopPropagation();
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(itemId => itemId !== id);
    }

    setSelected(newSelected);
  };

  const handleCheckboxChange = (id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(itemId => itemId !== id);
    }

    setSelected(newSelected);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  const handleBatchMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setBatchMenuAnchorEl(event.currentTarget);
  };

  const handleBatchMenuClose = () => {
    setBatchMenuAnchorEl(null);
  };

  const handleCategoryMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCategoryMenuAnchorEl(event.currentTarget);
    handleBatchMenuClose();
  };

  const handleCategoryMenuClose = () => {
    setCategoryMenuAnchorEl(null);
  };

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAccountMenuAnchorEl(event.currentTarget);
    handleBatchMenuClose();
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchorEl(null);
  };

  const handleUpdateCategory = (category: string) => {
    if (onBatchUpdate && selected.length > 0) {
      onBatchUpdate(selected, { category });
    }
    handleCategoryMenuClose();
  };

  const handleUpdateAccount = (accountId: number | null) => {
    if (onBatchUpdate && selected.length > 0) {
      onBatchUpdate(selected, { accountId: accountId || undefined });
    }
    handleAccountMenuClose();
  };

  const handleBatchDelete = () => {
    if (selected.length > 0) {
      if (window.confirm(`Are you sure you want to delete ${selected.length} transactions?`)) {
        Promise.all(selected.map(id => onDelete(id)))
          .then(() => {
            setSelected([]);
          })
          .catch(error => {
            console.error('Failed to delete transactions:', error);
          });
      }
    }
    handleBatchMenuClose();
  };

  const handleRowExpand = (id: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Function to determine if a transaction should be displayed as positive
  const shouldDisplayAsPositive = (transaction: Transaction) => {
    // Check for savings-related keywords in description or category
    const savingsKeywords = ['saving', 'investment', 'deposit', 'transfer to', '401k', 'ira', 'retirement'];
    
    // Check description
    const descriptionMatch = transaction.description && 
      savingsKeywords.some(keyword => 
        transaction.description.toLowerCase().includes(keyword)
      );
    
    // Check category
    const categoryMatch = transaction.category && 
      (transaction.category.toLowerCase().includes('saving') || 
       transaction.category.toLowerCase().includes('investment'));
    
    // Only return true if it's a savings transaction AND it's negative
    const result = (descriptionMatch || categoryMatch) && transaction.amount < 0;
    
    // Debug log
    console.log('Transaction:', {
      id: transaction.id,
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      descriptionMatch,
      categoryMatch,
      shouldBePositive: result
    });
    
    return result;
  };

  // Function to get display amount
  const getDisplayAmount = (transaction: Transaction) => {
    // If it's a savings transaction that should be displayed as positive
    if (shouldDisplayAsPositive(transaction)) {
      return Math.abs(transaction.amount);
    }
    // Otherwise, return the original amount
    return transaction.amount;
  };

  // Function to get display sign (+ or -)
  const getDisplaySign = (transaction: Transaction) => {
    // If it's a savings transaction that should be displayed as positive
    if (shouldDisplayAsPositive(transaction)) {
      return '+';
    } 
    // If it's already positive
    else if (transaction.amount > 0) {
      return '+';
    }
    // If it's negative
    return '';
  };

  // Function to determine the color for the amount
  const getAmountColor = (transaction: Transaction) => {
    // If it's a savings transaction that should be displayed as positive
    if (shouldDisplayAsPositive(transaction)) {
      return 'success.main';
    } 
    // If it's already positive
    else if (transaction.amount > 0) {
      return 'success.main';
    }
    // If it's negative
    return 'error.main';
  };

  // Function to determine which icon to show
  const getAmountIcon = (transaction: Transaction) => {
    // If it's a savings transaction that should be displayed as positive
    if (shouldDisplayAsPositive(transaction)) {
      return <IncomeIcon fontSize="small" sx={{ mr: 0.5 }} />;
    } 
    // If it's already positive
    else if (transaction.amount > 0) {
      return <IncomeIcon fontSize="small" sx={{ mr: 0.5 }} />;
    }
    // If it's negative
    return <ExpenseIcon fontSize="small" sx={{ mr: 0.5 }} />;
  };

  const getCategoryDisplayName = (transaction: Transaction) => {
    // First try to get the name from the categoryObj if it exists
    if (transaction.categoryObj && transaction.categoryObj.name) {
      return transaction.categoryObj.name;
    }
    // Fall back to the category string if categoryObj is not available
    if (transaction.category) {
      return transaction.category;
    }
    // Default if neither is available
    return 'Uncategorized';
  };

  // Add a new handler for toggling transaction signs
  const handleToggleTransactionSigns = () => {
    if (onBatchUpdate && selected.length > 0) {
      // Get the selected transactions
      const selectedTransactions = transactions.filter(t => selected.includes(t.id));
      
      // Process each transaction to toggle its sign
      Promise.all(selectedTransactions.map(transaction => {
        // Create a new amount with the opposite sign
        const newAmount = -transaction.amount;
        
        // Determine the new type based on the new amount
        const newType = newAmount > 0 ? 'INCOME' : 'EXPENSE';
        
        // Update the transaction with the new amount and type
        return onBatchUpdate([transaction.id], { 
          amount: newAmount,
          type: newType
        });
      }))
      .then(() => {
        setSelected([]);
      })
      .catch(error => {
        console.error('Failed to toggle transaction signs:', error);
      });
    }
    handleBatchMenuClose();
  };

  return (
    <div>
      <Toolbar
        sx={{
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
          ...(selected.length > 0 && {
            bgcolor: (theme) =>
              alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
          }),
        }}
      >
        {selected.length > 0 ? (
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {selected.length} selected
          </Typography>
        ) : (
          <Typography
            sx={{ flex: '1 1 100%' }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Transactions
          </Typography>
        )}

        {selected.length > 0 && (
          <Tooltip title="More actions">
            <Button
              onClick={handleBatchMenuOpen}
              startIcon={<MoreIcon />}
              variant="outlined"
              size="small"
            >
              Actions
            </Button>
          </Tooltip>
        )}
      </Toolbar>
      
      <TableContainer component={Paper} sx={{ maxHeight: '60vh', overflow: 'auto' }}>
        <Table stickyHeader aria-label="transactions table" size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < transactions.length}
                  checked={transactions.length > 0 && selected.length === transactions.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all transactions' }}
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
              const isItemSelected = isSelected(transaction.id);
              const isExpanded = expandedRows[transaction.id] || false;
              
              return (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  isSelected={isItemSelected}
                  isExpanded={isExpanded}
                  accounts={accounts}
                  handleSelectClick={handleSelectClick}
                  handleRowExpand={handleRowExpand}
                  handleMenuOpen={handleMenuOpen}
                  getAmountColor={getAmountColor}
                  getAmountIcon={getAmountIcon}
                  formatCurrency={formatCurrency}
                  getCategoryDisplayName={getCategoryDisplayName}
                />
              );
            })}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No transactions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transaction Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Batch Actions Menu */}
      <Menu
        anchorEl={batchMenuAnchorEl}
        open={Boolean(batchMenuAnchorEl)}
        onClose={handleBatchMenuClose}
      >
        <MenuItem onClick={handleToggleTransactionSigns}>
          <ListItemIcon>
            <SwapVertIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Toggle Sign</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCategoryMenuOpen}>
          <ListItemIcon>
            <CategoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Category</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAccountMenuOpen}>
          <ListItemIcon>
            <AccountIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Account</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleBatchDelete}>
          <ListItemIcon>
            <DeleteMultipleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Selected</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Category Menu */}
      <Menu
        anchorEl={categoryMenuAnchorEl}
        open={Boolean(categoryMenuAnchorEl)}
        onClose={handleCategoryMenuClose}
      >
        {CATEGORIES.map((cat) => (
          <MenuItem key={cat} onClick={() => handleUpdateCategory(cat)}>
            {cat}
          </MenuItem>
        ))}
      </Menu>
      
      {/* Account Menu */}
      <Menu
        anchorEl={accountMenuAnchorEl}
        open={Boolean(accountMenuAnchorEl)}
        onClose={handleAccountMenuClose}
      >
        <MenuItem onClick={() => handleUpdateAccount(null)}>
          No Account
        </MenuItem>
        {Object.entries(accounts).map(([id, name]) => (
          <MenuItem key={id} onClick={() => handleUpdateAccount(Number(id))}>
            {name}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};

export default TransactionList; 