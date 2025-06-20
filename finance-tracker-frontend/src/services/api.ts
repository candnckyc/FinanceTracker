// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  Transaction, 
  TransactionCreateDto, 
  DashboardStats
} from '../types';
import logger from '../utils/logger';

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
        
        logger.apiRequest(config.method?.toUpperCase() || 'UNKNOWN', config.url || '');
        return config;
      },
      (error) => {
        logger.error('API Request Error', error, 'API', 'REQUEST_ERROR');
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.apiResponse(
          response.config.method?.toUpperCase() || 'UNKNOWN',
          response.config.url || '',
          response.status,
          response.data
        );
        return response;
      },
      (error) => {
        const status = error.response?.status || 0;
        const url = error.config?.url || '';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        
        logger.apiResponse(method, url, status, error.response?.data);
        
        if (error.response?.status === 401) {
          logger.warn('Token expired, redirecting to login', undefined, 'AUTH', 'TOKEN_EXPIRED');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Helper function to convert backend transaction to frontend format
  private mapBackendTransaction(backendTransaction: any): Transaction {
    // Backend now sends clean DTOs, so we can map directly
    return {
      id: backendTransaction.id.toString(),
      description: backendTransaction.description,
      amount: Math.abs(backendTransaction.amount), // Always positive for display
      type: backendTransaction.amount >= 0 ? 'Income' : 'Expense',
      category: backendTransaction.category,
      date: backendTransaction.date,
      userId: backendTransaction.userId
    };
  }

  // Helper function to convert frontend transaction to backend format
  private mapFrontendTransaction(frontendTransaction: TransactionCreateDto): any {
    return {
      description: frontendTransaction.description,
      amount: frontendTransaction.type === 'Income' ? 
        Math.abs(frontendTransaction.amount) : 
        -Math.abs(frontendTransaction.amount), // Negative for expenses
      date: frontendTransaction.date,
      category: frontendTransaction.category
    };
  }

  // Auth methods
  async login(data: LoginRequest): Promise<AuthResponse> {
    const perfId = logger.performanceStart('login');
    try {
      logger.info('Attempting login', { email: data.email }, 'AUTH', 'LOGIN_ATTEMPT');
      const response: AxiosResponse<any> = await this.api.post('/auth/login', data);
      
      const mappedResponse: AuthResponse = {
        token: response.data.token,
        user: {
          id: response.data.userId,
          email: response.data.userEmail,
          username: response.data.userName,
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || ''
        }
      };
      
      logger.performanceEnd(perfId, 'login');
      logger.authSuccess('login', mappedResponse.user);
      return mappedResponse;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'login');
      logger.authError('login', error);
      throw error;
    }
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const perfId = logger.performanceStart('register');
    try {
      logger.info('Attempting registration', { email: data.email, firstName: data.firstName }, 'AUTH', 'REGISTER_ATTEMPT');
      
      const response: AxiosResponse<any> = await this.api.post('/auth/register', data);
      
      const mappedResponse: AuthResponse = {
        token: response.data.token,
        user: {
          id: response.data.userId,
          email: response.data.userEmail,
          username: response.data.userName,
          firstName: response.data.firstName || data.firstName,
          lastName: response.data.lastName || data.lastName
        }
      };
      
      logger.performanceEnd(perfId, 'register');
      logger.authSuccess('register', mappedResponse.user);
      return mappedResponse;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'register');
      logger.authError('register', error);
      throw error;
    }
  }

  // Transaction methods
  async getTransactions(): Promise<Transaction[]> {
    const perfId = logger.performanceStart('getTransactions');
    try {
      logger.info('Fetching transactions', undefined, 'TRANSACTIONS', 'GET_ALL');
      const response = await this.api.get<any[]>('/transactions');
      
      // Map backend transactions to frontend format
      const mappedTransactions = response.data.map(this.mapBackendTransaction);
      
      logger.performanceEnd(perfId, 'getTransactions');
      logger.info(`Fetched ${mappedTransactions.length} transactions`, { count: mappedTransactions.length }, 'TRANSACTIONS', 'GET_ALL_SUCCESS');
      return mappedTransactions;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'getTransactions');
      logger.error('Failed to fetch transactions', error, 'TRANSACTIONS', 'GET_ALL_ERROR');
      throw error;
    }
  }

  async createTransaction(data: TransactionCreateDto): Promise<Transaction> {
    const perfId = logger.performanceStart('createTransaction');
    try {
      logger.info('Creating transaction', { type: data.type, amount: data.amount, category: data.category }, 'TRANSACTIONS', 'CREATE');
      
      // Convert frontend format to backend format
      const backendData = this.mapFrontendTransaction(data);
      
      const response = await this.api.post<any>('/transactions', backendData);
      
      // Convert response back to frontend format
      const mappedTransaction = this.mapBackendTransaction(response.data);
      
      logger.performanceEnd(perfId, 'createTransaction');
      logger.info('Transaction created successfully', { id: mappedTransaction.id }, 'TRANSACTIONS', 'CREATE_SUCCESS');
      return mappedTransaction;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'createTransaction');
      logger.error('Failed to create transaction', { data, error }, 'TRANSACTIONS', 'CREATE_ERROR');
      throw error;
    }
  }

  async updateTransaction(id: string, data: TransactionCreateDto): Promise<Transaction> {
    const perfId = logger.performanceStart('updateTransaction');
    try {
      logger.info('Updating transaction', { id, type: data.type, amount: data.amount }, 'TRANSACTIONS', 'UPDATE');
      
      const backendData = this.mapFrontendTransaction(data);
      const response = await this.api.put<any>(`/transactions/${id}`, backendData);
      const mappedTransaction = this.mapBackendTransaction(response.data);
      
      logger.performanceEnd(perfId, 'updateTransaction');
      logger.info('Transaction updated successfully', { id }, 'TRANSACTIONS', 'UPDATE_SUCCESS');
      return mappedTransaction;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'updateTransaction');
      logger.error('Failed to update transaction', { id, data, error }, 'TRANSACTIONS', 'UPDATE_ERROR');
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<void> {
    const perfId = logger.performanceStart('deleteTransaction');
    try {
      logger.info('Deleting transaction', { id }, 'TRANSACTIONS', 'DELETE');
      await this.api.delete(`/transactions/${id}`);
      logger.performanceEnd(perfId, 'deleteTransaction');
      logger.info('Transaction deleted successfully', { id }, 'TRANSACTIONS', 'DELETE_SUCCESS');
    } catch (error: any) {
      logger.performanceEnd(perfId, 'deleteTransaction');
      logger.error('Failed to delete transaction', { id, error }, 'TRANSACTIONS', 'DELETE_ERROR');
      throw error;
    }
  }

  // Dashboard/Stats methods
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Try to use the statistics endpoint first
      const response = await this.api.get('/transactions/statistics');
      return {
        totalIncome: response.data.totalIncome || 0,
        totalExpenses: response.data.totalExpenses || 0,
        balance: response.data.balance || 0,
        transactionCount: response.data.transactionCount || 0
      };
    } catch (error) {
      // Fallback to calculating from transactions
      logger.warn('Statistics endpoint failed, calculating from transactions', error, 'API', 'STATS_FALLBACK');
      
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
}

export const apiService = new ApiService();
export default apiService;