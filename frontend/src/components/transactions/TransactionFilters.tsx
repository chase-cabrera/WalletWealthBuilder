import React, { useState, useEffect } from 'react';
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
import { TransactionQuery, getCategories } from '../../services/transactionService';
import { Account } from '../../services/accountService';
import { format, isValid } from 'date-fns';

interface TransactionFiltersProps {
  accounts: Account[];
  onFilter: (filters: TransactionQuery) => void;
  initialFilters?: TransactionQuery;
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
  initialFilters = {}
}) => {
  const [startDate, setStartDate] = useState<Date | null>(
    initialFilters.startDate ? new Date(initialFilters.startDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    initialFilters.endDate ? new Date(initialFilters.endDate) : null
  );
  const [minAmount, setMinAmount] = useState<string>(
    initialFilters.minAmount ? initialFilters.minAmount.toString() : ''
  );
  const [maxAmount, setMaxAmount] = useState<string>(
    initialFilters.maxAmount ? initialFilters.maxAmount.toString() : ''
  );
  const [category, setCategory] = useState<string>(initialFilters.category || 'all');
  const [accountId, setAccountId] = useState<number | ''>(
    initialFilters.accountId || ''
  );
  const [type, setType] = useState<string>(initialFilters.type || 'all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(
    (initialFilters?.sortOrder as 'ASC' | 'DESC') || 'DESC'
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const fetchedCategories = await getCategories();
        
        if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) {
          setCategories(fetchedCategories);
        } else {
          console.warn('No categories returned from API, using static list');
          setCategories(CATEGORIES);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories(CATEGORIES);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    console.log('Setting initial filter values:', initialFilters);
    
    // Set the form values from initialFilters
    setStartDate(initialFilters.startDate ? new Date(initialFilters.startDate) : null);
    setEndDate(initialFilters.endDate ? new Date(initialFilters.endDate) : null);
    setCategory(initialFilters.category || 'all');
    setType(initialFilters.type || 'all');
    setMinAmount(initialFilters.minAmount ? initialFilters.minAmount.toString() : '');
    setMaxAmount(initialFilters.maxAmount ? initialFilters.maxAmount.toString() : '');
    setSearch(initialFilters.search || '');
    setSortBy(initialFilters.sortBy || 'date');
    setSortOrder(initialFilters.sortOrder || 'DESC');
  }, [initialFilters]);

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

    if (category) {
      filters.category = category;
      newActiveFilters.push(`Category: ${category}`);
    }

    if (accountId) {
      filters.accountId = Number(accountId);
      const accountName = accounts.find(a => a.id === Number(accountId))?.name;
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
    filters.sortOrder = sortOrder;
    
    if (sortBy !== 'date' || sortOrder !== 'DESC') {
      newActiveFilters.push(
        `Sort: ${sortBy} (${sortOrder === 'ASC' ? 'ascending' : 'descending'})`
      );
    }

    setActiveFilters(newActiveFilters);
    onFilter(filters);
  };

  const resetFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setType('all');
    setCategory('all');
    setAccountId('');
    setMinAmount('');
    setMaxAmount('');
    setSearch('');
    setSortBy('date');
    setSortOrder('DESC');
    setActiveFilters([]);
    onFilter({
      sortBy: 'date',
      sortOrder: 'DESC'
    });
  };

  const handleRemoveFilter = (filter: string) => {
    if (filter.startsWith('After')) {
      setStartDate(null);
    } else if (filter.startsWith('Before')) {
      setEndDate(null);
    } else if (filter.startsWith('Categories') || filter.startsWith('Category')) {
      setCategory('all');
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
      setSortOrder('DESC');
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
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="INCOME">Income</MenuItem>
            <MenuItem value="EXPENSE">Expense</MenuItem>
          </TextField>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="category-label">Categories</InputLabel>
            <Select
              labelId="category-label"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              input={<OutlinedInput label="Categories" />}
              disabled={categoriesLoading}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map((cat) => (
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
            onChange={(e) => setAccountId(e.target.value as number | '')}
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
          <FormControl fullWidth margin="normal">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                applyFilters();
              }}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="amount">Amount</MenuItem>
              <MenuItem value="description">Description</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Sort Order</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'ASC' | 'DESC');
                applyFilters();
              }}
            >
              <MenuItem value="DESC">Descending</MenuItem>
              <MenuItem value="ASC">Ascending</MenuItem>
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