import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/user.entity';
import { Account } from './account.entity';
import { Category } from './category.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column()
  description: string;

  @Column({ nullable: true })
  vendor: string;

  @Column({ nullable: true })
  purchaser: string;

  @Column({ nullable: true })
  note: string;

  @Column()
  type: string;

  @Column()
  category: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Account, account => account.transactions, { eager: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ nullable: true })
  accountId: number;

  @ManyToOne(() => User, user => user.transactions, { eager: false })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 