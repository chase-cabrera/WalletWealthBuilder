import { Transaction } from '../services/transactionService';
import Papa from 'papaparse';

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

export const importTransactionsFromCSV = (csvData: string) => {
  const result = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true
  });
  
  const transactions = result.data.map((row: any) => {
    // Try to find account information in various column names
    const accountColumn = 
      Object.keys(row).find(key => 
        key.toLowerCase().includes('account') || 
        key.toLowerCase() === 'acct' || 
        key.toLowerCase() === 'bank' ||
        key.toLowerCase() === 'from' ||
        key.toLowerCase() === 'source'
      );
    
    const accountName = accountColumn ? row[accountColumn] : null;
    
    return {
      date: row.Date || row.date || row.DATE || row.TransactionDate || new Date().toISOString().split('T')[0],
      description: row.Description || row.description || row.DESC || row.Memo || row.memo || row.DESCRIPTION || '',
      amount: parseFloat((row.Amount || row.amount || row.AMOUNT || row.Value || row.value || '0').toString().replace(/[^0-9.-]+/g, '')),
      category: row.Category || row.category || row.CATEGORY || row.Type || row.type || 'Uncategorized',
      type: parseFloat((row.Amount || row.amount || '0').toString().replace(/[^0-9.-]+/g, '')) >= 0 ? 'INCOME' : 'EXPENSE',
      accountName: accountName
    };
  });
  
  return transactions;
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