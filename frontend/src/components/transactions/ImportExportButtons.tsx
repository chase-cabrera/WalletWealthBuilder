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
  onImportSuccess: () => void;
  onError: (message: string) => void;
  transactions?: Transaction[];
  onImport?: (data: any[]) => Promise<void>;
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
      onError('Failed to load accounts');
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
        
        // Check if the CSV has an account column
        const hasAccountColumn = results.meta.fields?.some(
          field => field.toLowerCase().includes('account') || 
                  field.toLowerCase() === 'acct' ||
                  field.toLowerCase() === 'bank'
        );
        
        console.log('CSV fields:', results.meta.fields);
        console.log('Has account column:', hasAccountColumn);
        
        if (!hasAccountColumn && parsedData.length > 0) {
          // Store parsed data and show account selection dialog
          setParsedTransactions(parsedData);
          setAccountSelectionOpen(true);
        } else {
          // Process transactions with account information
          processTransactions(parsedData);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        onError('Error parsing CSV file');
      }
    });
  };
  
  const processTransactions = async (transactions: any[], accountId?: string | number) => {
    try {
      console.log('Processing transactions:', transactions);
      console.log('Using account ID:', accountId);
      
      // Map CSV data to transaction format with better field mapping
      const formattedTransactions = transactions.map(item => {
        // Parse amount properly, handling currency symbols and commas
        let amount = 0;
        if (item.Amount && typeof item.Amount === 'string') {
          // Remove currency symbols, commas, etc. and parse as float
          amount = parseFloat(item.Amount.replace(/[^0-9.-]+/g, ''));
        } else if (item.amount && typeof item.amount === 'string') {
          amount = parseFloat(item.amount.replace(/[^0-9.-]+/g, ''));
        } else if (typeof item.Amount === 'number') {
          amount = item.Amount;
        } else if (typeof item.amount === 'number') {
          amount = item.amount;
        }
        
        // Determine transaction type based on amount
        const type = amount >= 0 ? 'INCOME' : 'EXPENSE';
        
        // Get date in the correct format
        let formattedDate = new Date().toISOString().split('T')[0]; // Default to today
        if (item.Date) {
          // Try to parse the date (assuming MM/DD/YY format)
          const dateParts = item.Date.split('/');
          if (dateParts.length === 3) {
            // Convert to YYYY-MM-DD format
            const year = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
            const month = dateParts[0].padStart(2, '0');
            const day = dateParts[1].padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }
        } else if (item.date) {
          formattedDate = item.date;
        }
        
        // Create a properly formatted transaction object
        return {
          date: formattedDate,
          description: item.Vendor || item.Description || item.description || item.memo || 'Imported Transaction',
          amount: Math.abs(amount), // Store absolute value
          category: item.Category || item.category || 'Uncategorized',
          type: item.Type || item.type || type,
          note: item.Note || item.note || '',
          purchaser: item.Purchaser || item.purchaser || '',
          accountId: accountId ? Number(accountId) : null
        };
      });
      
      console.log('Formatted transactions with accountId:', formattedTransactions);
      
      // Import the transactions
      const result = await transactionService.importFromCSV(formattedTransactions);
      console.log('Import result:', result);
      
      setImportSuccess(true);
      onImportSuccess();
      
      // Close dialogs after a short delay
      setTimeout(() => {
        setAccountSelectionOpen(false);
        setImportDialogOpen(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error processing transactions:', error);
      onError('Error processing transactions');
    }
  };
  
  const handleSelectAccount = () => {
    if (selectedAccountId) {
      console.log('Selected account ID:', selectedAccountId, 'Type:', typeof selectedAccountId);
      processTransactions(parsedTransactions, selectedAccountId);
    }
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
        onImportSuccess();
        
      } catch (error) {
        console.error('Error creating account:', error);
        onError('Error creating account');
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
                  <MenuItem key={account.id} value={account.id}>
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