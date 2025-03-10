import React from 'react';
import { Typography } from '@mui/material';
import { Transaction } from '../../types/Transaction';

interface TransactionDetailProps {
  transaction: Transaction;
}

const TransactionDetail: React.FC<TransactionDetailProps> = ({ transaction }) => {
  // Helper function to get category name safely
  const getCategoryName = () => {
    if (!transaction.category) return 'Uncategorized';
    
    if (typeof transaction.category === 'string') {
      return transaction.category;
    }
    
    return transaction.category.name;
  };
  
  return (
    <div>
      <Typography variant="body1">
        <strong>Category:</strong> {getCategoryName()}
      </Typography>
      {/* Add other transaction details here */}
    </div>
  );
};

export default TransactionDetail; 