import { IsNotEmpty, IsNumber, IsString, IsIn } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'OTHER'])
  type: string;

  @IsNumber()
  @IsNotEmpty()
  balance: number;
} 