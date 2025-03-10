import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async getMonthlySpendingByCategory(userId: number, months: number = 6): Promise<any> {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, months - 1));
    const endDate = endOfMonth(today);

    // Use query builder to avoid type issues
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.user.id = :userId', { userId })
      .andWhere('transaction.type = :type', { type: 'EXPENSE' })
      .andWhere('transaction.date >= :startDate', { startDate: startDate.toISOString().split('T')[0] })
      .andWhere('transaction.date <= :endDate', { endDate: endDate.toISOString().split('T')[0] })
      .getMany();

    // Group by month and category
    const monthlyData = {};
    
    transactions.forEach(transaction => {
      const month = format(new Date(transaction.date), 'yyyy-MM');
      const category = transaction.category || 'Uncategorized';
      
      if (!monthlyData[month]) {
        monthlyData[month] = {};
      }
      
      if (!monthlyData[month][category]) {
        monthlyData[month][category] = 0;
      }
      
      monthlyData[month][category] += Number(transaction.amount);
    });

    return monthlyData;
  }

  async getIncomeVsExpenses(userId: number, months: number = 12): Promise<any> {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, months - 1));
    const endDate = endOfMonth(today);

    // Use query builder to avoid type issues
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.user.id = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate: startDate.toISOString().split('T')[0] })
      .andWhere('transaction.date <= :endDate', { endDate: endDate.toISOString().split('T')[0] })
      .getMany();

    // Group by month and type
    const monthlyData = {};
    
    transactions.forEach(transaction => {
      const month = format(new Date(transaction.date), 'yyyy-MM');
      const type = transaction.type;
      
      if (!monthlyData[month]) {
        monthlyData[month] = { INCOME: 0, EXPENSE: 0 };
      }
      
      monthlyData[month][type] += Number(transaction.amount);
    });

    return monthlyData;
  }

  async getNetWorthTrend(userId: number, months: number = 12): Promise<any> {
    const today = new Date();
    const startDate = startOfMonth(subMonths(today, months - 1));
    const endDate = endOfMonth(today);

    // Use query builder to avoid type issues
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.account', 'account')
      .where('transaction.user.id = :userId', { userId })
      .andWhere('transaction.date >= :startDate', { startDate: startDate.toISOString().split('T')[0] })
      .andWhere('transaction.date <= :endDate', { endDate: endDate.toISOString().split('T')[0] })
      .getMany();

    console.log(`Calculating net worth trend for user ${userId} from ${startDate} to ${endDate}`);

    // Get current account balances
    const accountsQuery = this.transactionRepository.manager.query(
      `SELECT a.id, a.balance 
       FROM accounts a 
       WHERE a.userId = ?`,
      [userId]
    );

    // Get all accounts for this user
    const accounts = await accountsQuery;
    
    console.log(`Found ${accounts.length} accounts with balances:`, accounts);
    
    // Calculate current total net worth from account balances
    const currentNetWorth = accounts.reduce((sum, account) => sum + Number(account.balance), 0);
    
    console.log(`Current net worth: ${currentNetWorth}`);
    
    // Create a map to track monthly net worth
    const monthlyNetWorth = new Map();
    
    // Set current month's net worth
    const currentMonth = format(today, 'yyyy-MM');
    monthlyNetWorth.set(currentMonth, currentNetWorth);
    
    // Generate all month keys we need to report on
    for (let i = 1; i < months; i++) {
      const monthDate = subMonths(today, i);
      const month = format(monthDate, 'yyyy-MM');
      monthlyNetWorth.set(month, null); // Initialize with null, will calculate later
    }
    
    // Clone the current account balances to work backwards
    const historicalBalances = new Map();
    accounts.forEach(account => {
      historicalBalances.set(account.id, Number(account.balance));
    });
    
    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    console.log('Transactions sorted by date (newest first)');
    
    // Process transactions to calculate historical balances
    let lastProcessedMonth = currentMonth;
    let runningNetWorth = currentNetWorth;
    
    console.log(`Starting with running net worth: ${runningNetWorth}`);
    
    // Process each transaction
    for (const transaction of transactions) {
      if (!transaction.account) {
        console.log(`Skipping transaction ${transaction.id} with no account`);
        continue;
      }
      
      const transactionMonth = format(new Date(transaction.date), 'yyyy-MM');
      
      // If we've moved to a new month, record the net worth for all months in between
      if (transactionMonth !== lastProcessedMonth) {
        console.log(`Moving from month ${lastProcessedMonth} to ${transactionMonth}`);
        // Fill in all months between the last processed month and this transaction's month
        for (const [month, value] of monthlyNetWorth.entries()) {
          if (value === null && month <= lastProcessedMonth && month > transactionMonth) {
            console.log(`Setting month ${month} net worth to ${runningNetWorth}`);
            monthlyNetWorth.set(month, runningNetWorth);
          }
        }
        lastProcessedMonth = transactionMonth;
      }
      
      // Reverse the transaction effect to go backwards in time
      const oldNetWorth = runningNetWorth;
      if (transaction.type === 'INCOME') {
        runningNetWorth -= Number(transaction.amount);
        console.log(`Reversing INCOME transaction ${transaction.id} of ${transaction.amount}: ${oldNetWorth} -> ${runningNetWorth}`);
      } else if (transaction.type === 'EXPENSE') {
        runningNetWorth += Number(transaction.amount);
        console.log(`Reversing EXPENSE transaction ${transaction.id} of ${transaction.amount}: ${oldNetWorth} -> ${runningNetWorth}`);
      }
      
      // Update the month's net worth
      monthlyNetWorth.set(transactionMonth, runningNetWorth);
    }
    
    // Fill in any remaining months that weren't covered by transactions
    for (const [month, value] of monthlyNetWorth.entries()) {
      if (value === null) {
        console.log(`Setting remaining month ${month} net worth to ${runningNetWorth}`);
        monthlyNetWorth.set(month, runningNetWorth);
      }
    }
    
    // Convert to array format sorted by date (oldest first)
    const result = Array.from(monthlyNetWorth.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    
    console.log('Final net worth trend data:', result);
    
    return result;
  }
}
