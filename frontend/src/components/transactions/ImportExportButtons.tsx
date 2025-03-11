import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton
} from '@mui/material';
import { 
  FileUpload as ImportIcon, 
  FileDownload as ExportIcon,
  Close as CloseIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { transactionsToCSV, importTransactionsFromCSV, downloadCSV } from '../../utils/csvUtils';
import { Transaction } from '../../services/transactionService';
import { Account } from '../../services/accountService';
import accountService from '../../services/accountService';
import transactionService from '../../services/transactionService';
import Papa from 'papaparse';

interface ImportExportButtonsProps {
  transactions?: Transaction[];
  onImport?: () => void;
  onImportSuccess?: () => void;
  onError?: (message: string) => void;
}

const ImportExportButtons: React.FC<ImportExportButtonsProps> = ({ 
  transactions = [], 
  onImport,
  onImportSuccess,
  onError
}) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [accountSelectionOpen, setAccountSelectionOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [showNewAccountField, setShowNewAccountField] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<string[] | { id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | number>('');
  
  // Fetch accounts when component mounts
  useEffect(() => {
    fetchAccounts();
  }, []);
  
  // Create a mapping of account IDs to names for the CSV export
  const accountMap: Record<number, string> = {};
  accounts.forEach(account => {
    accountMap[account.id] = account.name;
  });
  
  // Create a mapping of account names to IDs for the CSV import
  const accountNameToId: Record<string, number> = {};
  accounts.forEach(account => {
    accountNameToId[account.name] = account.id;
  });

  const handleExport = () => {
    try {
      const csvData = transactionsToCSV(transactions, accountMap);
      downloadCSV(csvData, 'transactions.csv');
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting transactions:', error);
    }
  };

  const handleImportClick = () => {
    // Fetch accounts before opening the dialog
    fetchAccounts();
    setImportDialogOpen(true);
    setImportError(null);
    setImportSuccess(false);
  };

  const fetchAccounts = async () => {
    try {
      const response = await accountService.getAll();
      setAccounts(response);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      if (onError) onError('Failed to load accounts');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as any[];
        
        // Debug log raw parsed data
        console.log('Raw parsed data:', parsedData);
        console.log('CSV fields:', results.meta.fields);
        
        // Check if the CSV has an account column
        const hasAccountColumn = results.meta.fields?.some(
          field => field.toLowerCase().includes('account') || 
                  field.toLowerCase() === 'acct' ||
                  field.toLowerCase() === 'bank'
        );
        
        console.log('Has account column:', hasAccountColumn);
        
        if (!hasAccountColumn && parsedData.length > 0) {
          // Store parsed data and show account selection dialog
          setParsedTransactions(parsedData);
          setAccountSelectionOpen(true);
        } else {
          // Process transactions with account information
          processTransactions(parsedData, accountNameToId[selectedAccountId]);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        if (onError) onError('Error parsing CSV file');
      }
    });
  };
  
  const processTransactions = async (transactions: any[], accountId: number) => {
    try {
      setIsImporting(true);
      console.log('Raw transactions to process:', transactions);

      const formattedTransactions = transactions.map(transaction => {
        // Debug log each transaction before formatting
        console.log('Processing transaction:', transaction);
        
        // Parse amount, handling different formats
        let amount = 0;
        if (transaction.Amount) {
          const cleanAmount = transaction.Amount.toString()
            .replace(/[^0-9.-]+/g, '')
            .replace(/,/g, '');
          amount = parseFloat(cleanAmount);
        }

        // Get category name if it's an object
        const category = transaction.Category && typeof transaction.Category === 'object' 
          ? transaction.Category.name 
          : transaction.Category;

        return {
          date: transaction.Date || new Date().toISOString().split('T')[0],
          amount: isNaN(amount) ? 0 : Math.abs(amount),
          description: transaction.Note || transaction.Vendor || 'Imported Transaction',
          vendor: transaction.Vendor || '',
          type: amount < 0 ? 'EXPENSE' : 'INCOME',
          category: category || 'Uncategorized',
          accountId: accountId
        };
      }).filter(transaction => {
        console.log('Checking transaction:', transaction);
        const isValid = transaction.amount !== 0;
        console.log('Is valid?', isValid);
        return isValid;
      });

      console.log('Formatted transactions:', formattedTransactions);
      
      if (formattedTransactions.length === 0) {
        throw new Error('No valid transactions found in the CSV file. Please check that your CSV file contains valid transaction amounts.');
      }

      const response = await transactionService.importTransactions(formattedTransactions);
      console.log('Import response:', response);

      if (onImportSuccess) {
        onImportSuccess();
      }
      setImportSuccess(true);
      setImportDialogOpen(false);
    } catch (error) {
      console.error('Import error:', error);
      setImportError('Failed to import transactions: ' + (error instanceof Error ? error.message : 'Unknown error'));
      if (onError) onError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleSelectAccount = () => {
    if (!selectedAccountId) {
      setImportError('Please select an account');
      return;
    }

    const accountId = accountNameToId[selectedAccountId];
    console.log('Account mapping:', {
      selectedAccountId,
      accountNameToId,
      resolvedAccountId: accountId
    });

    if (!accountId) {
      setImportError('Invalid account selected');
      return;
    }

    processTransactions(parsedTransactions, accountId);
  };
  
  const handleCreateAccount = async () => {
    if (newAccountName.trim()) {
      try {
        // Create a new account
        const newAccount = {
          name: newAccountName.trim(),
          type: 'CHECKING', // Default type
          balance: 0,
          institution: ''
        };
        
        const response = await accountService.create(newAccount);
        
        // Add the new account to the accounts list
        setAccounts([...accounts, response]);
        
        // Process transactions with the new account
        processTransactions(parsedTransactions, response.id);
        
        // Show success message
        if (onImportSuccess) {
          onImportSuccess();
        }
        
      } catch (error) {
        console.error('Error creating account:', error);
        if (onError) onError('Error creating account');
      }
    }
  };
  
  const handleCancel = () => {
    setSelectedAccountId('');
    setNewAccountName('');
    setShowNewAccountField(false);
    setAccountSelectionOpen(false);
    setParsedTransactions([]);
  };

  return (
    <>
      <Stack direction="row" spacing={2}>
        <Button 
          variant="outlined" 
          startIcon={<ImportIcon />}
          onClick={handleImportClick}
        >
          Import
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<ExportIcon />}
          onClick={() => setExportDialogOpen(true)}
          disabled={transactions.length === 0}
        >
          Export
        </Button>
      </Stack>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Import Transactions
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setImportDialogOpen(false)}
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
          <Alert severity="info" sx={{ mb: 2 }}>
            Budgets will be automatically created for any new categories in your imported transactions.
          </Alert>
          {importSuccess ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                Transactions imported successfully!
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Upload a CSV file to import transactions. The file should have the following columns: Date, Amount, Description, Type, Category, Account.
              </Typography>
              <Button
                variant="contained"
                component="label"
                fullWidth
                sx={{ mt: 2 }}
              >
                SELECT CSV FILE
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Export Transactions
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setExportDialogOpen(false)}
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
          <DialogContentText>
            Export your transactions to a CSV file that you can open in Excel or other spreadsheet applications.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Selection Dialog */}
      <Dialog
        open={accountSelectionOpen}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div">
            Select Account
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleCancel}
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No account information was found in your CSV file. Please select an account for these transactions.
          </Typography>

          {!showNewAccountField ? (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="account-select-label">Account</InputLabel>
              <Select
                labelId="account-select-label"
                id="account-select"
                value={selectedAccountId}
                label="Account"
                onChange={(e) => setSelectedAccountId(e.target.value as string)}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.name}>
                    {account.name} ({account.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="New Account Name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                autoFocus
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            {!showNewAccountField ? (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setShowNewAccountField(true)}
                color="primary"
              >
                Create New Account
              </Button>
            ) : (
              <Button
                onClick={() => setShowNewAccountField(false)}
                color="inherit"
              >
                Select Existing Account
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancel} color="inherit">
            Cancel
          </Button>
          {!showNewAccountField ? (
            <Button
              onClick={handleSelectAccount}
              variant="contained"
              color="primary"
              disabled={!selectedAccountId}
            >
              Select Account
            </Button>
          ) : (
            <Button
              onClick={handleCreateAccount}
              variant="contained"
              color="primary"
              disabled={!newAccountName.trim()}
            >
              Create & Select
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportExportButtons; 