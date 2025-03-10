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

// Define the TransactionQuery interface
interface TransactionQuery {
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
  sortDirection?: string;
  accountId?: number;
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private accountsService: AccountsService,
    private categoriesService: CategoriesService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, user: User): Promise<Transaction> {
    // Create a new transaction instance directly
    const transaction = new Transaction();
    
    // Assign properties manually
    Object.assign(transaction, {
      ...createTransactionDto,
      user
    });

    // If accountId is provided, fetch the account
    if (createTransactionDto.accountId) {
      const account = await this.accountsService.findOne(createTransactionDto.accountId, user.id);
      transaction.account = account;
      
      // Update account balance
      if (transaction.type === 'INCOME') {
        account.balance += transaction.amount;
      } else if (transaction.type === 'EXPENSE') {
        account.balance -= transaction.amount;
      }
      
      await this.accountsService.update(account.id, { balance: account.balance }, user.id);
    }

    // If category is provided, find or create the category
    if (createTransactionDto.category) {
      const category = await this.categoriesService.findOrCreate(
        createTransactionDto.category,
        transaction.type,
        user.id
      );
      transaction.category = category;
      transaction.categoryId = category.id;
    }

    return this.transactionRepository.save(transaction);
  }

  async findAll(
    userId: number,
    query: TransactionQuery = {},
    page = 1,
    limit = 50
  ): Promise<{ transactions: Transaction[]; total: number; pages: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId });
    
    // Apply filters if provided
    if (query.startDate) {
      queryBuilder.andWhere('transaction.date >= :startDate', { startDate: query.startDate });
    }
    
    if (query.endDate) {
      queryBuilder.andWhere('transaction.date <= :endDate', { endDate: query.endDate });
    }
    
    if (query.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: query.type });
    }
    
    if (query.category) {
      queryBuilder.andWhere('category.name = :category', { category: query.category });
    }
    
    if (query.accountId) {
      queryBuilder.andWhere('account.id = :accountId', { accountId: query.accountId });
    }

    if (query.minAmount) {
      queryBuilder.andWhere('transaction.amount >= :minAmount', { minAmount: query.minAmount });
    }

    if (query.maxAmount) {
      queryBuilder.andWhere('transaction.amount <= :maxAmount', { maxAmount: query.maxAmount });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(transaction.description LIKE :search OR category.name LIKE :search OR transaction.vendor LIKE :search)',
        { search: `%${query.search}%` }
      );
    }
    
    // Order by date descending (newest first) by default, but allow custom sorting
    if (query.sortBy && query.sortDirection) {
      // Convert to uppercase and ensure it's either ASC or DESC
      const direction = query.sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      queryBuilder.orderBy(`transaction.${query.sortBy}`, direction as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy('transaction.date', 'DESC');
    }
    
    // Get total count before pagination
    const total = await queryBuilder.getCount();
    
    // Apply pagination
    const pageSize = query.pageSize || limit;
    const currentPage = query.page || page;
    const skip = (currentPage - 1) * pageSize;
    
    queryBuilder.skip(skip).take(pageSize);
    
    // Execute query
    const transactions = await queryBuilder.getMany();
    
    return {
      transactions,
      total,
      pages: Math.ceil(total / pageSize)
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

  async importFromCSV(csvData: any[], user: User) {
    console.log('Received CSV data:', JSON.stringify(csvData.slice(0, 2)));
    const importedTransactions: Transaction[] = [];
    const failedTransactions: any[] = [];
    
    for (const item of csvData) {
      try {
        // Log the item being processed
        console.log('Processing item:', JSON.stringify(item));
        
        // First, check if we have an accountId and find the account
        let account: Account | null = null;
        if (item.accountId) {
          console.log('Found accountId:', item.accountId, 'Type:', typeof item.accountId);
          try {
            account = await this.accountsService.findOne(Number(item.accountId), user.id);
            console.log('Found account:', JSON.stringify(account));
          } catch (error) {
            console.error('Error finding account:', error);
          }
        }
        
        // Determine transaction type based on amount if not provided
        const amount = typeof item.amount === 'string' 
          ? parseFloat(item.amount.replace(/[^0-9.-]+/g, '')) 
          : (item.amount || 0);
        
        const type = item.type || (amount >= 0 ? 'INCOME' : 'EXPENSE');
        
        // Create transaction without category first
        const transaction = new Transaction();
        transaction.date = item.date || new Date().toISOString().split('T')[0];
        transaction.description = item.description || item.memo || 'Imported Transaction';
        transaction.amount = Math.abs(amount);
        transaction.type = type;
        transaction.note = item.note || '';
        transaction.vendor = item.vendor || '';
        transaction.purchaser = item.purchaser || '';
        transaction.user = user;
        
        // Set account if found
        if (account) {
          transaction.account = account;
          transaction.accountId = account.id;
          
          // Update account balance
          if (transaction.type === 'INCOME') {
            account.balance += Math.abs(amount);
          } else if (transaction.type === 'EXPENSE') {
            account.balance -= Math.abs(amount);
          }
          
          await this.accountsService.update(account.id, { balance: account.balance }, user.id);
        }
        
        // Save transaction first to get an ID
        const savedTransaction = await this.transactionRepository.save(transaction);
        
        // Now handle category separately
        if (item.category) {
          try {
            const category = await this.categoriesService.findOrCreate(
              item.category,
              type,
              user.id
            );
            
            console.log(`Found/created category: ${category.name} with ID: ${category.id}`);
            
            // Update the transaction with the category ID
            await this.transactionRepository.update(
              savedTransaction.id,
              { categoryId: category.id }
            );
            
            // Reload the transaction to get the updated data
            const updatedTransaction = await this.transactionRepository.findOne({
              where: { id: savedTransaction.id },
              relations: ['category', 'account']
            });
            
            console.log('Updated transaction with category:', JSON.stringify(updatedTransaction));
            
            // Add a null check before pushing to the array
            if (updatedTransaction) {
              importedTransactions.push(updatedTransaction);
            } else {
              // If for some reason we can't find the updated transaction, use the saved one
              importedTransactions.push(savedTransaction);
            }
          } catch (error) {
            console.error('Error setting category:', error);
            importedTransactions.push(savedTransaction);
          }
        } else {
          importedTransactions.push(savedTransaction);
        }
      } catch (error) {
        console.error('Error importing transaction:', error, 'Item:', JSON.stringify(item));
        failedTransactions.push(item);
      }
    }
    
    return {
      success: importedTransactions.length,
      failed: failedTransactions.length,
      importedTransactions,
      failedTransactions
    };
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
} 