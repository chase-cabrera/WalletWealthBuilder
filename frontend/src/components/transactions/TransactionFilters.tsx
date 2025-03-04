import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TransactionQuery } from '../../services/transactionService';
import { Account } from '../../services/accountService';
import { format, isValid } from 'date-fns';

interface TransactionFiltersProps {
  accounts: Account[];
  onFilter: (filters: TransactionQuery) => void;
}

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Housing',
  'Transportation',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Personal Care',
  'Education',
  'Travel',
  'Gifts & Donations',
  'Income',
  'Other',
];

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  accounts,
  onFilter,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<string>('');
  const [category, setCategory] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<number | ''>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const applyFilters = () => {
    const filters: TransactionQuery = {};
    const newActiveFilters: string[] = [];

    if (startDate && isValid(startDate)) {
      filters.startDate = format(startDate, 'yyyy-MM-dd');
      newActiveFilters.push(`Start: ${format(startDate, 'MM/dd/yyyy')}`);
    }

    if (endDate && isValid(endDate)) {
      filters.endDate = format(endDate, 'yyyy-MM-dd');
      newActiveFilters.push(`End: ${format(endDate, 'MM/dd/yyyy')}`);
    }

    if (type) {
      filters.type = type;
      newActiveFilters.push(`Type: ${type}`);
    }

    if (category.length === 1) {
      filters.category = category[0];
      newActiveFilters.push(`Category: ${category[0]}`);
    } else if (category.length > 1) {
      filters.category = category[0];
      newActiveFilters.push(`Categories: ${category.join(', ')}`);
    }

    if (accountId !== '') {
      filters.accountId = Number(accountId);
      const accountName = accounts.find(a => a.id === accountId)?.name;
      if (accountName) {
        newActiveFilters.push(`Account: ${accountName}`);
      }
    }

    if (minAmount) {
      filters.minAmount = parseFloat(minAmount);
      newActiveFilters.push(`Min Amount: $${minAmount}`);
    }

    if (maxAmount) {
      filters.maxAmount = parseFloat(maxAmount);
      newActiveFilters.push(`Max Amount: $${maxAmount}`);
    }

    if (search) {
      filters.search = search;
      newActiveFilters.push(`Search: ${search}`);
    }

    filters.sortBy = sortBy;
    filters.sortDirection = sortDirection;
    
    if (sortBy !== 'date' || sortDirection !== 'desc') {
      newActiveFilters.push(`Sort: ${sortBy} (${sortDirection === 'asc' ? 'ascending' : 'descending'})`);
    }

    setActiveFilters(newActiveFilters);
    onFilter(filters);
  };

  const resetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setType('');
    setCategory([]);
    setAccountId('');
    setMinAmount('');
    setMaxAmount('');
    setSearch('');
    setSortBy('date');
    setSortDirection('desc');
    setActiveFilters([]);
    onFilter({
      sortBy: 'date',
      sortDirection: 'desc'
    });
  };

  const handleRemoveFilter = (filter: string) => {
    if (filter.startsWith('After')) {
      setStartDate(null);
    } else if (filter.startsWith('Before')) {
      setEndDate(null);
    } else if (filter === 'Income' || filter === 'Expense') {
      setType('');
    } else if (filter.startsWith('Categories') || filter.startsWith('Category')) {
      setCategory([]);
    } else if (filter.startsWith('Account')) {
      setAccountId('');
    } else if (filter.startsWith('Min')) {
      setMinAmount('');
    } else if (filter.startsWith('Max')) {
      setMaxAmount('');
    } else if (filter.startsWith('Search')) {
      setSearch('');
    } else if (filter.startsWith('Sort')) {
      setSortBy('date');
      setSortDirection('desc');
    }
    
    setTimeout(applyFilters, 0);
  };

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </LocalizationProvider>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </LocalizationProvider>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
          >
            <MenuItem value="">All Types</MenuItem>
            <MenuItem value="INCOME">Income</MenuItem>
            <MenuItem value="EXPENSE">Expense</MenuItem>
          </TextField>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="category-label">Categories</InputLabel>
            <Select
              labelId="category-label"
              multiple
              value={category}
              onChange={(e) => setCategory(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Categories" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            select
            label="Account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
            variant="outlined"
            size="small"
          >
            <MenuItem value="">All Accounts</MenuItem>
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            label="Min Amount"
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: <span>$</span>,
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            label="Max Amount"
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: <span>$</span>,
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              input={<OutlinedInput label="Sort By" />}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="amount">Amount</MenuItem>
              <MenuItem value="description">Description</MenuItem>
              <MenuItem value="vendor">Vendor</MenuItem>
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="createdAt">Created At</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort Direction</InputLabel>
            <Select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
              input={<OutlinedInput label="Sort Direction" />}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" onClick={resetFilters}>
              Reset
            </Button>
            <Button variant="contained" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {activeFilters.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Filters:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {activeFilters.map((filter, index) => (
              <Chip
                key={index}
                label={filter}
                onDelete={() => handleRemoveFilter(filter)}
                size="small"
                sx={{ mb: 1 }}
              />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default TransactionFilters; 