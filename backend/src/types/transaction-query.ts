export interface TransactionQuery {
  userId?: number;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  type?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  accountId?: number;
} 