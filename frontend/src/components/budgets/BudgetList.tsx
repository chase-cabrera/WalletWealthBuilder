import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper 
} from '@mui/material';
import { getCategoryDisplay } from '../../utils/categoryUtils';
import { Category } from '../../types/Category';

interface Budget {
  id: number;
  category: Category | string;
  amount: number;
  spent: number;
  startDate: string;
  endDate: string;
  // ... other budget properties
}

interface BudgetListProps {
  budgets: Budget[];
  // ... other props
}

const BudgetList: React.FC<BudgetListProps> = ({ budgets }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Category</TableCell>
            <TableCell align="right">Budget</TableCell>
            <TableCell align="right">Spent</TableCell>
            <TableCell align="right">Remaining</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {budgets.map((budget) => {
            const categoryName = typeof budget.category === 'string' 
              ? budget.category 
              : budget.category.name;
              
            return (
              <TableRow key={budget.id}>
                <TableCell>{categoryName}</TableCell>
                <TableCell align="right">${budget.amount}</TableCell>
                <TableCell align="right">${budget.spent}</TableCell>
                <TableCell align="right">${budget.amount - budget.spent}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BudgetList; 