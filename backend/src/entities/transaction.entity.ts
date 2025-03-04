import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { Account } from './account.entity';
import { Category } from './category.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  date: Date;

  @Column()
  type: string;

  @Column({ nullable: true })
  category: string;

  @ManyToOne(() => Category, category => category.transactions, { nullable: true })
  categoryObj: Category;

  @ManyToOne(() => User, user => user.transactions)
  user: User;

  @ManyToOne(() => Account, account => account.transactions, { nullable: true })
  account: Account | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 