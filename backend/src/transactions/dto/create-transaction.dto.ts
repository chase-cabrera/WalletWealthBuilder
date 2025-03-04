import { IsNotEmpty, IsNumber, IsString, IsDateString, IsIn, IsOptional } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['INCOME', 'EXPENSE'])
  type: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsDateString()
  date: string;

  @IsNumber()
  @IsOptional()
  accountId?: number;
} 