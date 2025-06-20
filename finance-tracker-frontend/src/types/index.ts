// src/types/index.ts
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }
  
  export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: string;
    date: string;
    userId: string;
  }
  
  export interface TransactionCreateDto {
    description: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: string;
    date: string;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }
  
  export interface AuthResponse {
    token: string;
    user: User;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[];
  }
  
  // Dashboard types
  export interface DashboardStats {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
  }