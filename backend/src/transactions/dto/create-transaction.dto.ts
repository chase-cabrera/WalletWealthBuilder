import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Transaction vendor' })
  @IsString()
  @IsOptional()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Transaction purchaser' })
  @IsString()
  @IsOptional()
  purchaser?: string;

  @ApiPropertyOptional({ description: 'Transaction note' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ description: 'Transaction type (INCOME or EXPENSE)' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'Transaction category name' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Transaction category ID' })
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({ description: 'Account ID for the transaction' })
  @IsNumber()
  @IsOptional()
  accountId?: number;
} 