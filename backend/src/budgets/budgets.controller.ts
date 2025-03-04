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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget' })
  @ApiResponse({ status: 201, description: 'The budget has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createBudgetDto: CreateBudgetDto, @Request() req) {
    const user = req.user;
    return this.budgetsService.create(createBudgetDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all budgets for the current user' })
  @ApiResponse({ status: 200, description: 'Return all budgets.' })
  findAll(@Request() req) {
    const user = req.user;
    return this.budgetsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a budget by ID' })
  @ApiResponse({ status: 200, description: 'Return the budget.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  findOne(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.budgetsService.findOne(+id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget' })
  @ApiResponse({ status: 200, description: 'The budget has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  update(@Param('id') id: string, @Body() updateBudgetDto: UpdateBudgetDto, @Request() req) {
    const user = req.user;
    return this.budgetsService.update(+id, updateBudgetDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiResponse({ status: 200, description: 'The budget has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Budget not found.' })
  remove(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.budgetsService.remove(+id, user.id);
  }
} 