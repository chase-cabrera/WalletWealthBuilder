import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  IconButton,
  Fab,
  useMediaQuery,
  useTheme,
  Skeleton
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import AccountForm from '../components/accounts/AccountForm';
import accountService, { Account, CreateAccountDto } from '../services/accountService';

const Accounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountService.getAll();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAdd = async (data: CreateAccountDto) => {
    try {
      await accountService.create(data);
      setIsFormOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleEdit = async (data: CreateAccountDto) => {
    try {
      if (selectedAccount) {
        await accountService.update(selectedAccount.id, data);
        setIsFormOpen(false);
        setSelectedAccount(undefined);
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error updating account:', error);
    }
  };

  const handleDelete = async (account: Account) => {
    try {
      await accountService.delete(account.id);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'CHECKING':
        return '#4caf50';
      case 'SAVINGS':
        return '#2196f3';
      case 'CREDIT_CARD':
        return '#f44336';
      case 'INVESTMENT':
        return '#9c27b0';
      case 'CASH':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Accounts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedAccount(undefined);
            setIsFormOpen(true);
          }}
          sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
        >
          Add Account
        </Button>
      </Box>

      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : accounts.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No accounts found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Add your first account to start tracking your finances
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedAccount(undefined);
              setIsFormOpen(true);
            }}
          >
            Add Account
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {accounts.map((account) => (
            <Grid item xs={12} sm={6} md={4} key={account.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: '0px 6px 12px -3px rgba(0,0,0,0.1)',
                  },
                  transition: 'box-shadow 0.3s ease-in-out',
                }}
              >
                <Box 
                  sx={{ 
                    height: 8, 
                    backgroundColor: getAccountTypeColor(account.type),
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                  }} 
                />
                <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    {account.name}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      display: 'inline-block',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      mt: 1
                    }}
                  >
                    {account.type}
                  </Typography>
                  <Typography 
                    variant="h5" 
                    component="div" 
                    sx={{ 
                      mt: 2,
                      fontWeight: 'bold',
                      color: account.balance < 0 ? 'error.main' : 'success.main'
                    }}
                  >
                    ${Math.abs(account.balance).toFixed(2)}
                    {account.balance < 0 && <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>DR</span>}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => {
                      setSelectedAccount(account);
                      setIsFormOpen(true);
                    }}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDelete(account)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Mobile FAB for adding accounts */}
      {isMobile && (
        <Fab 
          color="primary" 
          aria-label="add account"
          sx={{ 
            position: 'fixed', 
            bottom: 16, 
            right: 16,
            display: { xs: 'flex', sm: 'none' }
          }}
          onClick={() => {
            setSelectedAccount(undefined);
            setIsFormOpen(true);
          }}
        >
          <AddIcon />
        </Fab>
      )}

      <AccountForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAccount(undefined);
        }}
        onSubmit={selectedAccount ? handleEdit : handleAdd}
        account={selectedAccount}
      />
    </Box>
  );
};

export default Accounts; 