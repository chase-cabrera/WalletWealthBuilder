import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('spending-by-category')
  @ApiOperation({ summary: 'Get monthly spending by category' })
  @ApiResponse({ status: 200, description: 'Returns monthly spending data grouped by category.' })
  async getMonthlySpendingByCategory(@Request() req, @Query('months') months: number) {
    const user = req.user;
    return this.reportsService.getMonthlySpendingByCategory(user.id, months || 6);
  }

  @Get('income-vs-expenses')
  @ApiOperation({ summary: 'Get monthly income vs expenses' })
  @ApiResponse({ status: 200, description: 'Returns monthly income and expense data.' })
  async getIncomeVsExpenses(@Request() req, @Query('months') months: number) {
    const user = req.user;
    return this.reportsService.getIncomeVsExpenses(user.id, months || 12);
  }

  @Get('net-worth-trend')
  @ApiOperation({ summary: 'Get net worth trend over time' })
  @ApiResponse({ status: 200, description: 'Returns monthly net worth data.' })
  async getNetWorthTrend(@Request() req, @Query('months') months: number) {
    const user = req.user;
    return this.reportsService.getNetWorthTrend(user.id, months || 12);
  }
}
