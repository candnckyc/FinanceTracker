// src/types/index.ts
export interface User {
  id: string;
  email: string;
  username: string;  // ← Bu satır var mı?
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
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
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
  