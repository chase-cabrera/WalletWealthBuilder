import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../auth/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { Account } from '../entities/account.entity';
import { BudgetsService } from '../budgets/budgets.service';
import { Budget } from '../entities/budget.entity';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { PaginatedResponse } from '../types/pagination';
import { TransactionQuery } from '../types/transaction-query';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(Budget)
    private budgetsRepository: Repository<Budget>,
    private accountsService: AccountsService,
    private categoriesService: CategoriesService,
    private budgetsService: BudgetsService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, user: User): Promise<Transaction> {
    const transaction = new Transaction();
    Object.assign(transaction, {
      ...createTransactionDto,
      user
    });

    // Save the transaction
    const savedTransaction = await this.transactionRepository.save(transaction);
    
    // Update budget spent amount if it's an expense
    if (transaction.type === 'EXPENSE' && (transaction.category || transaction.categoryId)) {
      await this.updateBudgetSpent(savedTransaction);
    }

    // Update account balance
    if (transaction.accountId) {
      const amount = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;
      await this.accountsService.updateBalance(transaction.accountId, amount, user);
    }
    
    return savedTransaction;
  }

  async findAll(query: TransactionQuery): Promise<PaginatedResponse<Transaction>> {
    const {
      userId,
      page = 1,
      pageSize = 10,
      sortBy = 'date',
      sortOrder = 'DESC',
      startDate,
      endDate,
      type,
      category,
      accountId,
      minAmount,
      maxAmount,
      search
    } = query;

    console.log('Backend - Transaction query received:', {
      startDate,
      endDate,
      category,
      type,
      startDateType: typeof startDate,
      endDateType: typeof endDate
    });

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId });
    
    // Apply filters if provided
    if (startDate) {
      // Use direct string comparison with the date part only
      queryBuilder.andWhere('DATE(transaction.date) >= DATE(:startDate)', { 
        startDate: startDate
      });
      console.log('Filtering transactions with startDate:', startDate);
    }
    
    if (endDate) {
      // Use direct string comparison with the date part only
      queryBuilder.andWhere('DATE(transaction.date) <= DATE(:endDate)', { 
        endDate: endDate
      });
      console.log('Filtering transactions with endDate:', endDate);
    }
    
    if (type) {
      queryBuilder.andWhere('transaction.type = :type', { type });
    }
    
    if (category) {
      queryBuilder.andWhere('category.name = :category', { category });
    }
    
    if (accountId) {
      queryBuilder.andWhere('account.id = :accountId', { accountId });
    }

    if (minAmount) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', { minAmount });
    }

    if (maxAmount) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', { maxAmount });
    }

    if (search) {
      queryBuilder.andWhere(
        '(transaction.description LIKE :search OR category.name LIKE :search OR transaction.vendor LIKE :search)',
        { search: `%${search}%` }
      );
    }
    
    // Order by date descending (newest first) by default, but allow custom sorting
    queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);
    
    // Get total count before pagination
    const total = await queryBuilder.getCount();
    
    const totalPages = Math.ceil(total / pageSize);
    const skip = (page - 1) * pageSize;
    
    // Execute query
    const data = await queryBuilder
      .skip(skip)
      .take(pageSize)
      .getMany();
    
    return {
      data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  async findOne(id: number, userId: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['account'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto, userId: number): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);
    
    // Handle account changes if needed
    if (updateTransactionDto.accountId !== undefined && 
        updateTransactionDto.accountId !== transaction.account?.id) {
      
      // Revert balance change on old account if it exists
      if (transaction.account) {
        const oldAccount = transaction.account;
        if (transaction.type === 'INCOME') {
          oldAccount.balance -= transaction.amount;
        } else if (transaction.type === 'EXPENSE') {
          oldAccount.balance += transaction.amount;
        }
        await this.accountsService.update(oldAccount.id, { balance: oldAccount.balance }, userId);
      }
      
      // Apply balance change to new account if provided
      if (updateTransactionDto.accountId) {
        const newAccount = await this.accountsService.findOne(updateTransactionDto.accountId, userId);
        transaction.account = newAccount;
        
        if (transaction.type === 'INCOME') {
          newAccount.balance += transaction.amount;
        } else if (transaction.type === 'EXPENSE') {
          newAccount.balance -= transaction.amount;
        }
        await this.accountsService.update(newAccount.id, { balance: newAccount.balance }, userId);
      } else {
        // If accountId is set to null, we need to handle this case
        // For example, we could make the account optional in the entity
        // or create a default account for the user
      }
    }
    
    // Update transaction properties
    Object.assign(transaction, updateTransactionDto);
    
    return this.transactionRepository.save(transaction);
  }

  async remove(id: number, userId: number): Promise<void> {
    const transaction = await this.findOne(id, userId);
    
    // Update account balance if needed
    if (transaction.account) {
      const account = transaction.account;
      if (transaction.type === 'INCOME') {
        account.balance -= transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        account.balance += transaction.amount;
      }
      await this.accountsService.update(account.id, { balance: account.balance }, userId);
    }
    
    await this.transactionRepository.remove(transaction);
  }

  async importTransactions(transactions: CreateTransactionDto[], user: User): Promise<Transaction[]> {
    const importedTransactions: Transaction[] = [];

    for (const transactionDto of transactions) {
      try {
        console.log('Processing transaction:', transactionDto);

        // Validate required fields
        if (!transactionDto.amount || isNaN(transactionDto.amount)) {
          console.error('Invalid amount:', transactionDto);
          continue;
        }

        // Create a new transaction instance
        const transaction = new Transaction();
        
        // Handle category first
        let categoryId: number | undefined;
        if (transactionDto.category) {
          try {
            const categoryType = this.determineCategoryType(transactionDto.type);
            console.log('Creating/finding category:', {
              name: transactionDto.category,
              type: categoryType,
              userId: user.id
            });
            
            const category = await this.categoriesService.findOrCreate(
              transactionDto.category,
              categoryType,
              user.id
            );
            
            console.log('Category result:', category);
            categoryId = category.id;
          } catch (error) {
            console.error('Error handling category:', error);
            continue;
          }
        }

        // Create the transaction with the proper category ID
        const transactionData = {
          date: transactionDto.date || new Date().toISOString().split('T')[0],
          amount: transactionDto.amount,
          description: transactionDto.description || transactionDto.vendor || 'Imported Transaction',
          vendor: transactionDto.vendor || '',
          type: transactionDto.type?.toUpperCase() || 'EXPENSE',
          categoryId, // Use the numeric ID we got from findOrCreate
          accountId: transactionDto.accountId,
          user
        };

        // Remove category property to prevent confusion
        delete transactionDto.category;

        Object.assign(transaction, transactionData);

        console.log('Saving transaction:', transaction);
        const savedTransaction = await this.transactionRepository.save(transaction);
        console.log('Saved transaction:', savedTransaction);

        // Update account balance
        if (transaction.accountId) {
          const amount = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;
          await this.accountsService.updateBalance(transaction.accountId, amount, user);
        }

        importedTransactions.push(savedTransaction);
      } catch (error) {
        console.error('Error importing transaction:', error);
      }
    }

    // After all transactions are imported, create/update budgets
    if (importedTransactions.length > 0) {
      await this.createBudgetsForImportedTransactions(importedTransactions, user);
    }

    return importedTransactions;
  }

  private determineCategoryType(transactionType: string): string {
    switch (transactionType?.toUpperCase()) {
      case 'INCOME':
        return 'INCOME';
      case 'INVESTMENT':
        return 'INVESTMENT';
      case 'SAVING':
        return 'SAVING';
      default:
        return 'EXPENSE';
    }
  }

  private async createBudgetsForImportedTransactions(transactions: Transaction[], user: User): Promise<void> {
    try {
      console.log('Creating budgets for transactions:', transactions);
      
      // Group transactions by category and month
      const budgetMap = new Map<string, { 
        categoryId: number, 
        spent: number,
        startDate: string,
        endDate: string,
        amount: number  // Add amount to track the transaction amount
      }>();

      // Process only transactions with valid category IDs
      for (const transaction of transactions) {
        if (!transaction.categoryId || isNaN(transaction.categoryId)) {
          console.log('Skipping transaction without valid categoryId:', transaction);
          continue;
        }

        const date = new Date(transaction.date);
        const startDate = format(startOfMonth(date), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(date), 'yyyy-MM-dd');
        const key = `${transaction.categoryId}-${startDate}`;

        const spent = transaction.type === 'EXPENSE' ? Math.abs(transaction.amount) : 0;
        
        if (budgetMap.has(key)) {
          const existing = budgetMap.get(key)!;
          existing.spent += spent;
          existing.amount = Math.max(existing.amount, spent); // Keep the highest amount
        } else {
          budgetMap.set(key, {
            categoryId: transaction.categoryId,
            spent,
            startDate,
            endDate,
            amount: spent
          });
        }
      }

      console.log('Budget map:', budgetMap);

      // Create or update budgets for each category-month combination
      for (const [_, budget] of budgetMap.entries()) {
        try {
          const category = await this.categoriesService.findOne(budget.categoryId, user.id);
          if (!category) {
            console.error(`Category not found for ID ${budget.categoryId}`);
            continue;
          }

          const existingBudget = await this.budgetsRepository.findOne({
            where: {
              categoryId: budget.categoryId,
              startDate: budget.startDate,
              endDate: budget.endDate,
              user: { id: user.id }
            }
          });

          if (existingBudget) {
            existingBudget.spent = budget.spent;
            if (budget.spent > existingBudget.amount) {
              existingBudget.amount = budget.spent;
            }
            await this.budgetsRepository.save(existingBudget);
            console.log(`Updated budget for ${category.name} for ${budget.startDate} to ${budget.endDate}`);
          } else {
            const newBudget = this.budgetsRepository.create({
              userId: user.id,
              categoryId: category.id,
              category,
              amount: budget.amount,
              spent: budget.spent,
              startDate: budget.startDate,
              endDate: budget.endDate,
              description: `Auto-created budget for ${category.name}`,
              isAutoCreated: true
            });
            await this.budgetsRepository.save(newBudget);
            console.log(`Created new budget for ${category.name} for ${budget.startDate} to ${budget.endDate}`);
          }
        } catch (error) {
          console.error(`Error processing budget for category ID ${budget.categoryId}:`, error);
          continue;
        }
      }
    } catch (error) {
      console.error('Error creating budgets for imported transactions:', error);
    }
  }

  async getUniqueCategories(userId: number): Promise<string[]> {
    const categories = await this.transactionRepository.manager
      .createQueryBuilder()
      .select('DISTINCT category.name', 'name')
      .from('categories', 'category')
      .where('category.userId = :userId', { userId })
      .getRawMany();
    
    // Extract just the category names and filter out any null/empty values
    return categories
      .map(c => c.name)
      .filter(c => c)
      .sort(); // Sort alphabetically
  }

  async deleteAll(userId: number): Promise<number> {
    // First, get all transactions with their accounts to update balances
    const transactions = await this.transactionRepository.find({
      where: { user: { id: userId } },
      relations: ['account'],
    });
    
    // Create a map to track balance adjustments for each account
    const accountBalanceAdjustments = new Map<number, number>();
    
    // Calculate balance adjustments for each account
    for (const transaction of transactions) {
      if (transaction.account) {
        const accountId = transaction.account.id;
        const adjustment = accountBalanceAdjustments.get(accountId) || 0;
        
        // Reverse the effect of the transaction on the account balance
        if (transaction.type === 'INCOME') {
          accountBalanceAdjustments.set(accountId, adjustment - transaction.amount);
        } else if (transaction.type === 'EXPENSE') {
          accountBalanceAdjustments.set(accountId, adjustment + transaction.amount);
        }
      }
    }
    
    // Update account balances
    for (const [accountId, adjustment] of accountBalanceAdjustments.entries()) {
      try {
        const account = await this.accountsService.findOne(accountId, userId);
        account.balance += adjustment;
        await this.accountsService.update(accountId, { balance: account.balance }, userId);
      } catch (error) {
        console.error(`Error updating account ${accountId} balance:`, error);
      }
    }
    
    // Now delete all transactions
    const result = await this.transactionRepository.delete({
      user: { id: userId }
    });
    
    return result.affected || 0;
  }

  // Add this new method to ensure a budget exists
  private async ensureBudgetExists(transaction: Transaction, user: User): Promise<void> {
    try {
      const date = new Date(transaction.date);
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      let categoryId: number;

      // Get the category ID
      if (transaction.categoryId) {
        categoryId = transaction.categoryId;
      } else if (transaction.category) {
        if (typeof transaction.category === 'string') {
          // Map transaction type to category type
          let categoryType: string;
          switch (transaction.type?.toUpperCase()) {
            case 'INCOME':
              categoryType = 'INCOME';
              break;
            case 'INVESTMENT':
              categoryType = 'INVESTMENT';
              break;
            case 'SAVING':
              categoryType = 'SAVING';
              break;
            default:
              categoryType = 'EXPENSE';
          }

          // Find or create the category
          const category = await this.categoriesService.findOrCreate(
            transaction.category,
            categoryType,
            user.id
          );
          categoryId = category.id;
        } else {
          categoryId = transaction.category.id;
        }
      } else {
        return; // No category to create a budget for
      }

      // Check if a budget already exists for this category and month
      const existingBudget = await this.budgetsRepository.findOne({
        where: {
          categoryId: categoryId,
          startDate: startDateStr,
          endDate: endDateStr,
          user: { id: user.id }
        }
      });

      // If no budget exists, create one with a default amount
      if (!existingBudget) {
        const category = await this.categoriesService.findOne(categoryId, user.id);
        
        const newBudget = this.budgetsRepository.create({
          userId: user.id,
          categoryId: category.id,
          category,
          amount: Math.abs(transaction.amount),
          startDate: startDateStr,
          endDate: endDateStr,
          description: `Auto-created budget for ${category.name}`,
          isAutoCreated: true
        });

        await this.budgetsRepository.save(newBudget);
        console.log(`Created new budget for category ${category.name} for ${startDateStr} to ${endDateStr}`);
      } else {
        // Update existing budget's spent amount
        if (transaction.type === 'EXPENSE') {
          existingBudget.spent += Math.abs(transaction.amount);
          // If spent exceeds amount, increase the budget amount
          if (existingBudget.spent > existingBudget.amount) {
            existingBudget.amount = existingBudget.spent;
          }
          await this.budgetsRepository.save(existingBudget);
          console.log(`Updated existing budget for category ${categoryId} for ${startDateStr} to ${endDateStr}`);
        }
      }
    } catch (error) {
      console.error('Error ensuring budget exists:', error);
      // Don't throw - we don't want to prevent transaction creation if budget creation fails
    }
  }

  private async updateBudgetSpent(transaction: Transaction): Promise<void> {
    if (!transaction.category) return;

    // Get the exact month of the transaction
    const transactionDate = new Date(transaction.date);
    const startDate = format(startOfMonth(transactionDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(transactionDate), 'yyyy-MM-dd');

    console.log('Updating budget spent for transaction:', {
      transactionId: transaction.id,
      transactionDate: transaction.date,
      startDate,
      endDate,
      category: typeof transaction.category === 'string' 
        ? transaction.category 
        : transaction.category.id,
      amount: transaction.amount
    });

    // Find the budget for this specific month and category
    const budget = await this.budgetsRepository.findOne({
      where: {
        categoryId: typeof transaction.category === 'string' 
          ? transaction.category 
          : transaction.category.id,
        startDate,
        endDate,
        user: { id: transaction.user.id }
      }
    });

    if (budget) {
      const spent = Math.abs(transaction.amount);
      budget.spent = (budget.spent || 0) + spent;
      await this.budgetsRepository.save(budget);
      
      console.log('Updated budget spent:', {
        budgetId: budget.id,
        category: budget.category,
        previousSpent: budget.spent - spent,
        newSpent: budget.spent,
        transactionAmount: spent
      });
    } else {
      console.log('No budget found for this transaction:', {
        transactionId: transaction.id,
        category: typeof transaction.category === 'string' 
          ? transaction.category 
          : transaction.category.id,
        startDate,
        endDate
      });
    }
  }
} 