import React from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Chip, 
  Divider,
  useTheme,
  Button,
  Avatar,
  ListItemAvatar
} from '@mui/material';
import { 
  ArrowUpward as IncomeIcon, 
  ArrowDownward as ExpenseIcon,
  ShoppingCart as ShoppingIcon,
  Home as HomeIcon,
  DirectionsCar as TransportIcon,
  Restaurant as FoodIcon,
  LocalHospital as HealthcareIcon,
  School as EducationIcon,
  Savings as SavingsIcon,
  Paid as IncomeIconMUI,
  CreditCard as DebitIcon,
  Category as DefaultIcon
} from '@mui/icons-material';
import { Transaction } from '../../services/transactionService';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

interface RecentTransactionsProps {
  transactions: Transaction[];
  accounts: Record<number, string>;
}

// Map of category to icon
const categoryIcons: Record<string, React.ReactElement> = {
  'Food': <FoodIcon />,
  'Housing': <HomeIcon />,
  'Transportation': <TransportIcon />,
  'Healthcare': <HealthcareIcon />,
  'Education': <EducationIcon />,
  'Shopping': <ShoppingIcon />,
  'Savings': <SavingsIcon />,
  'Income': <IncomeIconMUI />,
  'Transfer': <DebitIcon />
};

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, accounts }) => {
  const theme = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || <DefaultIcon />;
  };

  // Get color for category chip
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'Food': theme.palette.mode === 'dark' ? '#81c784' : '#4caf50',
      'Housing': theme.palette.mode === 'dark' ? '#90caf9' : '#2196f3',
      'Transportation': theme.palette.mode === 'dark' ? '#ce93d8' : '#9c27b0',
      'Healthcare': theme.palette.mode === 'dark' ? '#f48fb1' : '#e91e63',
      'Education': theme.palette.mode === 'dark' ? '#ffcc80' : '#ff9800',
      'Shopping': theme.palette.mode === 'dark' ? '#b39ddb' : '#673ab7',
      'Savings': theme.palette.mode === 'dark' ? '#80deea' : '#00bcd4',
      'Income': theme.palette.mode === 'dark' ? '#a5d6a7' : '#4caf50',
      'Transfer': theme.palette.mode === 'dark' ? '#e6ee9c' : '#cddc39'
    };
    
    return colorMap[category] || (theme.palette.mode === 'dark' ? '#bdbdbd' : '#9e9e9e');
  };

  // Get background color for avatar based on transaction type
  const getAvatarColor = (amount: number) => {
    return amount >= 0 
      ? (theme.palette.mode === 'dark' ? '#388e3c' : '#4caf50') // Income - green
      : (theme.palette.mode === 'dark' ? '#d32f2f' : '#f44336'); // Expense - red
  };

  // Get account name safely
  const getAccountName = (accountId: number | undefined): string => {
    if (accountId === undefined || !accounts[accountId]) {
      return 'Unknown Account';
    }
    return accounts[accountId];
  };

  if (transactions.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          No transactions to display.
        </Typography>
        <Button 
          component={Link} 
          to="/transactions" 
          variant="contained" 
          color="primary"
          size="small"
          sx={{ mt: 2 }}
        >
          Add Transaction
        </Button>
      </Box>
    );
  }

  return (
    <List disablePadding>
      {transactions.slice(0, 5).map((transaction, index) => (
        <React.Fragment key={transaction.id}>
          {index > 0 && <Divider component="li" />}
          <ListItem 
            alignItems="flex-start"
            sx={{ 
              py: 1.5,
              px: 0,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
                borderRadius: 1
              }
            }}
          >
            <ListItemAvatar>
              <Avatar 
                sx={{ 
                  bgcolor: getAvatarColor(transaction.amount),
                  color: '#fff'
                }}
              >
                {getCategoryIcon(transaction.category || 'Default')}
              </Avatar>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight="medium">
                    {transaction.description}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight="medium"
                    color={transaction.amount >= 0 ? 'success.main' : 'error.main'}
                  >
                    {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={transaction.category || 'Uncategorized'} 
                      size="small" 
                      sx={{ 
                        mr: 1, 
                        backgroundColor: getCategoryColor(transaction.category || ''),
                        color: theme.palette.getContrastText(getCategoryColor(transaction.category || '')),
                        fontWeight: 'medium',
                        fontSize: '0.75rem'
                      }} 
                    />
                    <Typography variant="caption" color="text.secondary">
                      {getAccountName(transaction.accountId)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(transaction.date), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              }
            />
          </ListItem>
        </React.Fragment>
      ))}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button 
          component={Link} 
          to="/transactions" 
          color="primary"
          size="small"
        >
          View All Transactions
        </Button>
      </Box>
    </List>
  );
};

export default RecentTransactions; 