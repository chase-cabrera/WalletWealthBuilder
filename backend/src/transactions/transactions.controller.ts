import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetUser } from '../auth/get-user.decorator';
import { User as UserEntity } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaginatedResponse } from '../types/pagination';
import { TransactionQuery } from '../types/transaction-query';
import { Transaction } from '../entities/transaction.entity';
import { TransactionRepository } from '../repositories/transaction.repository';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly transactionRepository: TransactionRepository
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'The transaction has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    const user = req.user;
    return this.transactionsService.create(createTransactionDto, user);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import transactions from CSV' })
  @ApiResponse({ status: 201, description: 'Transactions have been successfully imported.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  importTransactions(@Body() csvData: any[], @Request() req) {
    const user = req.user;
    return this.transactionsService.importTransactions(csvData, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions for the current user' })
  @ApiResponse({ status: 200, description: 'Return all transactions.' })
  async findAll(
    @GetUser() user: UserEntity,
    @Query() query: TransactionQuery
  ): Promise<PaginatedResponse<Transaction>> {
    const validPageSize = Math.min(Math.max(1, query.pageSize || 10), 100);
    
    return this.transactionsService.findAll({
      userId: user.id,
      ...query,
      pageSize: validPageSize
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all unique transaction categories for the current user' })
  @ApiResponse({ status: 200, description: 'Return all unique categories.' })
  async getCategories(@Request() req): Promise<string[]> {
    const user = req.user;
    return this.transactionsService.getUniqueCategories(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({ status: 200, description: 'Return the transaction.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  findOne(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.transactionsService.findOne(+id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({ status: 200, description: 'The transaction has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto, @Request() req) {
    const user = req.user;
    return this.transactionsService.update(+id, updateTransactionDto, user.id);
  }

  @Delete('all')
  @ApiOperation({ summary: 'Delete all transactions for the current user' })
  @ApiResponse({ status: 200, description: 'All transactions have been successfully deleted.' })
  async deleteAll(@Request() req): Promise<{ message: string; count: number }> {
    const user = req.user;
    const result = await this.transactionsService.deleteAll(user.id);
    return { 
      message: 'All transactions deleted successfully', 
      count: result 
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: 200, description: 'The transaction has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  remove(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.transactionsService.remove(+id, user.id);
  }

  @Get('debug-date-range')
  async debugDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @GetUser() user: UserEntity
  ): Promise<any> {
    try {
      // Get all transactions for this date range
      const transactions = await this.transactionRepository
        .createQueryBuilder('transaction')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('transaction.userId = :userId', { userId: user.id })
        .andWhere('DATE(transaction.date) >= DATE(:startDate)', { startDate })
        .andWhere('DATE(transaction.date) <= DATE(:endDate)', { endDate })
        .getMany();
      
      // Group transactions by date
      const transactionsByDate = transactions.reduce((acc, t) => {
        const date = t.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push({
          id: t.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: typeof t.category === 'string' ? t.category : t.category?.name || 'N/A'
        });
        return acc;
      }, {});
      
      return {
        totalCount: transactions.length,
        startDate,
        endDate,
        transactionsByDate
      };
    } catch (error) {
      console.error('Error debugging date range:', error);
      throw error;
    }
  }
} 