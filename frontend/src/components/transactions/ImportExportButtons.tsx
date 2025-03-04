import React, { useState } from 'react';
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
  Stack
} from '@mui/material';
import { 
  FileUpload as ImportIcon, 
  FileDownload as ExportIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { transactionsToCSV, importTransactionsFromCSV, downloadCSV } from '../../utils/csvUtils';
import { Transaction } from '../../services/transactionService';
import { Account } from '../../services/accountService';

interface ImportExportButtonsProps {
  transactions: Transaction[];
  onImport: (data: any[]) => Promise<void>;
  accounts?: Account[];
}

const ImportExportButtons: React.FC<ImportExportButtonsProps> = ({ 
  transactions, 
  onImport,
  accounts = []
}) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
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
    setImportDialogOpen(true);
    setImportError(null);
    setImportSuccess(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportError(null);
    setImportSuccess(false);
    
    try {
      console.log('Reading file:', file.name);
      
      // Read the file as text
      const fileText = await readFileAsText(file);
      console.log('File content length:', fileText.length);
      
      // Parse the CSV
      const data = importTransactionsFromCSV(fileText, accountNameToId);
      console.log('CSV import complete, received data:', data);
      
      if (data.length === 0) {
        setImportError('No valid transactions found in the CSV file. Please check the format.');
        return;
      }
      
      // Call the onImport callback with the parsed data
      await onImport(data);
      
      setImportSuccess(true);
      // Close the dialog after a successful import
      setTimeout(() => setImportDialogOpen(false), 1500);
    } catch (error) {
      console.error('Error importing transactions:', error);
      setImportError('Failed to import transactions. Please check the file format.');
    } finally {
      setIsImporting(false);
    }
  };
  
  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File read error'));
      };
      
      reader.readAsText(file);
    });
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
      <Dialog open={importDialogOpen} onClose={() => !isImporting && setImportDialogOpen(false)}>
        <DialogTitle>Import Transactions</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Upload a CSV file to import transactions. The file should have the following columns:
            Date, Amount, Description, Type, Category, Account.
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
            <input
              accept=".csv"
              style={{ display: 'none' }}
              id="import-file"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="import-file">
              <Button 
                variant="contained" 
                component="span"
                disabled={isImporting}
              >
                {isImporting ? (
                  <CircularProgress size={24} />
                ) : (
                  'Select CSV File'
                )}
              </Button>
            </label>
          </Box>
          {importError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {importError}
            </Alert>
          )}
          {importSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Transactions imported successfully!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setImportDialogOpen(false)} 
            startIcon={<CloseIcon />}
            disabled={isImporting}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Transactions</DialogTitle>
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
    </>
  );
};

export default ImportExportButtons; 