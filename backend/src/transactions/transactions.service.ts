import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../auth/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';

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
      const categoryObj = await this.categoriesService.findOrCreate(
        createTransactionDto.category,
        transaction.type,
        user.id
      );
      transaction.categoryObj = categoryObj;
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
      queryBuilder.andWhere('transaction.category = :category', { category: query.category });
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
        '("transaction"."description" LIKE :search OR "transaction"."category" LIKE :search)',
        { search: `%${query.search}%` }
      );
    }
    
    // Order by date descending (newest first) by default, but allow custom sorting
    if (query.sortBy && query.sortDirection) {
      queryBuilder.orderBy(`transaction.${query.sortBy}`, query.sortDirection.toUpperCase());
    } else {
      queryBuilder.orderBy('transaction.date', 'DESC');
    }
    
    // Get total count before applying pagination
    const total = await queryBuilder.getCount();
    
    // Apply pagination if provided
    if (page && limit) {
      const validPage = isNaN(page) || page < 1 ? 1 : page;
      const validPageSize = isNaN(limit) || limit < 1 || limit > 1000 ? 50 : limit;
      
      const skip = (validPage - 1) * validPageSize;
      
      queryBuilder.skip(skip).take(validPageSize);
    }
    
    // Make sure to select the account
    const transactions = await queryBuilder
      .orderBy('transaction.date', 'DESC')
      .addOrderBy('transaction.createdAt', 'DESC')
      .getMany();
    
    return {
      transactions,
      total,
      pages: Math.ceil(total / limit)
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
    const importedTransactions = [];
    const failedTransactions = [];
    
    for (const item of csvData) {
      try {
        // Log the item being processed
        console.log('Processing item:', JSON.stringify(item));
        
        // First, check if we have an accountId and find the account
        let account = null;
        if (item.accountId) {
          console.log('Found accountId:', item.accountId, 'Type:', typeof item.accountId);
          try {
            account = await this.accountsService.findOne(Number(item.accountId), user.id);
            console.log('Found account:', JSON.stringify(account));
          } catch (error) {
            console.error('Error finding account:', error);
          }
        }
        
        // Create a new transaction object with better defaults and type handling
        const transaction = this.transactionRepository.create({
          date: item.date || new Date().toISOString().split('T')[0],
          description: item.description || item.memo || 'Imported Transaction',
          amount: typeof item.amount === 'string' ? parseFloat(item.amount.replace(/[^0-9.-]+/g, '')) : (item.amount || 0),
          category: item.category || 'Uncategorized',
          type: item.type || (parseFloat(String(item.amount).replace(/[^0-9.-]+/g, '')) >= 0 ? 'INCOME' : 'EXPENSE'),
          note: item.note || '',
          purchaser: item.purchaser || '',
          user
        });
        
        // Set the account if we found one
        if (account) {
          // Set both the account relation and the accountId
          transaction.account = account;
          transaction.accountId = account.id;
          
          // Update account balance
          if (transaction.type === 'INCOME') {
            account.balance += transaction.amount;
          } else if (transaction.type === 'EXPENSE') {
            account.balance -= transaction.amount;
          }
          
          await this.accountsService.update(account.id, { balance: account.balance }, user.id);
        } else {
          console.log('No account found for transaction');
        }
        
        // Save the transaction
        console.log('Saving transaction:', JSON.stringify(transaction));
        const savedTransaction = await this.transactionRepository.save(transaction);
        console.log('Saved transaction:', JSON.stringify(savedTransaction));
        importedTransactions.push(savedTransaction);
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
    const categories = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('DISTINCT transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      .getRawMany();
    
    // Extract just the category names and filter out any null/empty values
    return categories
      .map(c => c.category)
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