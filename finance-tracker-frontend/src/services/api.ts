// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  Transaction, 
  TransactionCreateDto, 
  ApiResponse,
  DashboardStats
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'http://localhost:5209/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    const response = await this.api.get<Transaction[]>('/transactions');
    return response.data;
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await this.api.get<Transaction>(`/transactions/${id}`);
    return response.data;
  }

  async createTransaction(data: TransactionCreateDto): Promise<Transaction> {
    const response = await this.api.post<Transaction>('/transactions', data);
    return response.data;
  }

  async updateTransaction(id: string, data: TransactionCreateDto): Promise<Transaction> {
    const response = await this.api.put<Transaction>(`/transactions/${id}`, data);
    return response.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.api.delete(`/transactions/${id}`);
  }

  // Dashboard/Stats methods
  async getDashboardStats(): Promise<DashboardStats> {
    const transactions = await this.getTransactions();
    
    const stats: DashboardStats = {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: transactions.length
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'Income') {
        stats.totalIncome += transaction.amount;
      } else {
        stats.totalExpenses += transaction.amount;
      }
    });

    stats.balance = stats.totalIncome - stats.totalExpenses;
    
    return stats;
  }
}

export const apiService = new ApiService();
export default apiService;