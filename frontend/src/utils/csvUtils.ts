import { Transaction } from '../services/transactionService';

// Define interfaces for CSV data
export interface TransactionCSV {
  date: string;
  amount: string;
  description: string;
  vendor: string;
  purchaser: string;
  note: string;
  type: string;
  category: string;
  account: string;
}

// Simple CSV parser for fallback
const simpleParse = (csv: string): any[] => {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    if (!line.trim()) return null;
    const values = line.split(',').map(v => v.trim());
    const obj: Record<string, string> = {};
    
    headers.forEach((header, i) => {
      obj[header.toLowerCase()] = values[i] || '';
    });
    
    return obj;
  }).filter(Boolean);
};

// Simple CSV stringifier for fallback
const simpleStringify = (data: any[], headers: string[]): string => {
  const headerRow = headers.join(',');
  const rows = data.map(item => 
    headers.map(header => item[header] || '').join(',')
  );
  
  return [headerRow, ...rows].join('\n');
};

export const transactionsToCSV = (transactions: Transaction[], accounts: Record<number, string>): string => {
  const headers = ['Date', 'Amount', 'Description', 'Vendor', 'Purchaser', 'Note', 'Type', 'Category', 'Account'];
  
  const rows = transactions.map(transaction => {
    return {
      date: transaction.date,
      amount: transaction.amount.toString(),
      description: transaction.description,
      vendor: transaction.vendor || '',
      purchaser: transaction.purchaser || '',
      note: transaction.note || '',
      type: transaction.type,
      category: transaction.category,
      account: transaction.accountId && accounts[transaction.accountId] ? accounts[transaction.accountId] : ''
    };
  });
  
  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    )
  ].join('\n');
  
  return csvContent;
};

export const importTransactionsFromCSV = (csvText: string, accounts: Record<string, number>): any[] => {
  console.log('Importing CSV with text length:', csvText.length);
  console.log('First 100 chars of CSV:', csvText.substring(0, 100));
  
  if (!csvText.trim()) {
    console.error('Empty CSV content');
    return [];
  }
  
  try {
    // Split into lines and filter out empty lines
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      console.error('CSV has no data rows, only found:', lines.length, 'lines');
      return [];
    }
    
    console.log('CSV header:', lines[0]);
    console.log('Total CSV rows:', lines.length);
    
    // Parse header to determine column positions
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('Parsed headers:', headers);
    
    // Map column indices
    const columnMap: Record<string, number> = {};
    
    // Make column mapping case-insensitive
    headers.forEach((header, index) => {
      columnMap[header.toLowerCase()] = index;
    });
    
    // Check for minimum required columns - only amount is truly required
    if (columnMap['amount'] === undefined) {
      console.error('Missing required amount column');
      return [];
    }
    
    // Parse data rows
    return lines.slice(1).map((line, lineIndex) => {
      try {
        // Handle quoted values properly
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Add the last value
        values.push(currentValue.trim());
        
        // Extract values using column map, with defaults for missing columns
        const date = columnMap['date'] !== undefined ? values[columnMap['date']] : new Date().toISOString().split('T')[0];
        const amount = columnMap['amount'] !== undefined ? values[columnMap['amount']] : '0';
        const description = columnMap['description'] !== undefined ? values[columnMap['description']] : '';
        const vendor = columnMap['vendor'] !== undefined ? values[columnMap['vendor']] : '';
        const purchaser = columnMap['purchaser'] !== undefined ? values[columnMap['purchaser']] : '';
        const note = columnMap['note'] !== undefined ? values[columnMap['note']] : '';
        
        // Default to EXPENSE if type column is missing
        const type = columnMap['type'] !== undefined ? values[columnMap['type']] : 'EXPENSE';
        
        const category = columnMap['category'] !== undefined ? values[columnMap['category']] : 'Uncategorized';
        const accountName = columnMap['account'] !== undefined ? values[columnMap['account']] : '';
        
        // Find account ID by name
        let accountId: number | undefined;
        if (accountName && accounts[accountName]) {
          accountId = accounts[accountName];
        }
        
        // Skip rows with empty amount
        if (!amount.trim()) {
          console.log(`Skipping row ${lineIndex + 2} due to empty amount`);
          return null;
        }
        
        console.log(`Parsed row ${lineIndex + 2}:`, {
          date, amount, description, vendor, purchaser, note, type, category, accountId
        });
        
        return {
          date: date || new Date().toISOString().split('T')[0],
          amount: parseFloat(amount.replace(/[^0-9.-]+/g, '')),
          description: description || vendor || 'Imported transaction',
          vendor,
          purchaser,
          note,
          type: (type && type.toUpperCase() === 'INCOME') ? 'INCOME' : 'EXPENSE',
          category: category || 'Uncategorized',
          accountId
        };
      } catch (error) {
        console.error(`Error parsing line ${lineIndex + 2}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  // Create download link
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to document, trigger click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 