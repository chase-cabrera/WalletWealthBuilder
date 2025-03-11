import { Category } from '../types/Category';

/**
 * Gets the category name from a transaction, handling both string and object categories
 * @param transaction The transaction object
 * @returns The category name as a string
 */
export const getCategoryName = (transaction: any): string => {
  if (!transaction) return 'Uncategorized';
  
  // If no category at all
  if (!transaction.category && !transaction.categoryId) {
    return 'Uncategorized';
  }
  
  // If category is a string
  if (typeof transaction.category === 'string') {
    return transaction.category;
  }
  
  // If category is an object
  if (transaction.category && typeof transaction.category === 'object' && 'name' in transaction.category) {
    return transaction.category.name;
  }
  
  // If we only have categoryId but no category object
  if (transaction.categoryId && !transaction.category) {
    return `Category #${transaction.categoryId}`;
  }
  
  return 'Uncategorized';
};

export const getCategoryDisplay = (category: Category | string | null | undefined): string => {
  if (!category) return '';
  if (typeof category === 'string') return category;
  if (typeof category === 'object' && 'name' in category) return category.name;
  return '';
};

export const getCategoryId = (category: Category | string | null | undefined): number | string => {
  if (!category) return '';
  if (typeof category === 'object') return category.id;
  return category;
}; 