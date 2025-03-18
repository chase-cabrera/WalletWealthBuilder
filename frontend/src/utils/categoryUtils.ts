import { Category } from '../types/Category';

// Define the CategoryObject type that's being used in TransactionTable
export interface CategoryObject {
  id: string | number;
  name: string;
  color?: string;
  icon?: string;
}

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

/**
 * Gets a display-friendly category name from various category formats
 * @param category - The category object, string, or ID
 * @returns A string representation of the category
 */
export const getCategoryDisplay = (
  category: string | Category | CategoryObject | null | undefined
): string => {
  if (!category) return 'Uncategorized';
  
  if (typeof category === 'string') {
    return category;
  }
  
  // Handle Category or CategoryObject
  if ('name' in category) {
    return category.name;
  }
  
  return 'Uncategorized';
};

export const getCategoryId = (category: Category | string | null | undefined): number | string => {
  if (!category) return '';
  if (typeof category === 'object') return category.id;
  return category;
};

/**
 * Gets a color for a category
 * @param category - The category object, string, or ID
 * @returns A color string
 */
export const getCategoryColor = (
  category: string | Category | CategoryObject | null | undefined
): string => {
  if (!category) return '#9e9e9e'; // Default gray
  
  if (typeof category === 'object' && 'color' in category && category.color) {
    return category.color;
  }
  
  // Default colors based on category name if available
  if (typeof category === 'object' && 'name' in category) {
    const name = category.name.toLowerCase();
    
    if (name.includes('food') || name.includes('grocery')) return '#4caf50'; // Green
    if (name.includes('transport') || name.includes('travel')) return '#2196f3'; // Blue
    if (name.includes('bill') || name.includes('utility')) return '#f44336'; // Red
    if (name.includes('entertainment')) return '#9c27b0'; // Purple
    if (name.includes('health') || name.includes('medical')) return '#00bcd4'; // Cyan
    if (name.includes('shopping')) return '#ff9800'; // Orange
  }
  
  // Default color
  return '#9e9e9e'; // Gray
}; 