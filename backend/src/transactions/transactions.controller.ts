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
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'The transaction has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createTransactionDto: CreateTransactionDto, @Request() req) {
    const user = req.user;
    return this.transactionsService.create(createTransactionDto, user);
  }

  @Post('import/csv')
  @ApiOperation({ summary: 'Import transactions from CSV data' })
  @ApiResponse({ status: 201, description: 'Transactions have been successfully imported.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  importFromCSV(@Body() csvData: any[], @Request() req) {
    const user = req.user;
    return this.transactionsService.importFromCSV(csvData, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions for the current user' })
  @ApiResponse({ status: 200, description: 'Return all transactions.' })
  async findAll(@Request() req, @Query() filters, @Res() response) {
    const user = req.user;
    
    // Extract pagination parameters
    const page = filters.page ? parseInt(filters.page, 10) : 1;
    const pageSize = filters.pageSize ? parseInt(filters.pageSize, 10) : 50;
    
    // Validate pagination parameters
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPageSize = isNaN(pageSize) || pageSize < 1 || pageSize > 1000 ? 50 : pageSize;
    
    // Remove pagination params from filters
    const { page: _, pageSize: __, ...restFilters } = filters;
    
    // Get paginated results and total count
    const result = await this.transactionsService.findAll(user.id, {
      ...restFilters,
      page: validPage,
      pageSize: validPageSize
    });
    
    // Set pagination headers
    response.header('X-Total-Count', result.total.toString());
    response.header('X-Page', validPage.toString());
    response.header('X-Page-Size', validPageSize.toString());
    response.header('X-Total-Pages', Math.ceil(result.total / validPageSize).toString());
    
    // Enable CORS for these headers
    response.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Page-Size, X-Total-Pages');
    
    // Return the transactions
    return response.json(result.data);
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
} 