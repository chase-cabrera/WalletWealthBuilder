import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ description: 'Category ID' })
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({ description: 'Budget amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ description: 'Budget description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Budget start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Budget end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({ description: 'Whether this budget was auto-created' })
  @IsBoolean()
  @IsOptional()
  isAutoCreated?: boolean;

  @IsOptional()
  @IsNumber()
  spent?: number;
} 