import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Box,
  Typography,
  TablePagination,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { format } from 'date-fns';
import { Transaction } from '../../services/transactionService';
import { getCategoryDisplay, CategoryObject } from '../../utils/categoryUtils';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  page?: number;
  totalCount?: number;
  rowsPerPage?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onDelete,
  page = 0,
  totalCount = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleEdit = () => {
    if (selectedTransaction && onEdit) {
      onEdit(selectedTransaction);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedTransaction && onDelete) {
      onDelete(selectedTransaction);
    }
    handleMenuClose();
  };

  // Determine if we should show pagination
  const showPagination = onPageChange !== undefined && totalCount > 0;

  if (isMobile) {
    return (
      <Box sx={{ mb: 2 }}>
        {transactions.map((transaction) => (
          <Card key={transaction.id} sx={{ mb: 1 }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'medium' }}>
                    {transaction.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(transaction.date), 'MMM d, yyyy')}
                  </Typography>
                  {isMobile && transaction.category && (
                    <Chip
                      label={getCategoryDisplay(transaction.category)}
                      size="small"
                      sx={{ mt: 0.5, maxWidth: '100%' }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 'medium',
                      color: transaction.amount < 0 ? 'error.main' : 'success.main',
                    }}
                  >
                    {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </Typography>
                  {(onEdit || onDelete) && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, transaction)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
        
        {showPagination && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={onPageChange}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {onEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
          {onDelete && <MenuItem onClick={handleDelete}>Delete</MenuItem>}
        </Menu>
      </Box>
    );
  }

  return (
    <Paper sx={{ mb: 2 }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Amount</TableCell>
              {(onEdit || onDelete) && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  {transaction.category && (
                    <Chip
                      label={getCategoryDisplay(transaction.category)}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography
                    sx={{
                      color: transaction.amount < 0 ? 'error.main' : 'success.main',
                      fontWeight: 'medium',
                    }}
                  >
                    {transaction.amount < 0 ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
                  </Typography>
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, transaction)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {showPagination && (
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {onEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
        {onDelete && <MenuItem onClick={handleDelete}>Delete</MenuItem>}
      </Menu>
    </Paper>
  );
};

export default TransactionTable; 