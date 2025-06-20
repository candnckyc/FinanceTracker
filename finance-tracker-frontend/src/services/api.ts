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
        
        // Log API request
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
        // Log successful API response
        logger.apiResponse(
          response.config.method?.toUpperCase() || 'UNKNOWN',
          response.config.url || '',
          response.status,
          response.data
        );
        return response;
      },
      (error) => {
        // Log API error response
        const status = error.response?.status || 0;
        const url = error.config?.url || '';
        const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
        
        logger.apiResponse(method, url, status, error.response?.data);
        
        if (error.response?.status === 401) {
          // Token expired or invalid
          logger.warn('Token expired, redirecting to login', undefined, 'AUTH', 'TOKEN_EXPIRED');
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
    const perfId = logger.performanceStart('login');
    try {
      logger.info('Attempting login', { email: data.email }, 'AUTH', 'LOGIN_ATTEMPT');
      const response = await this.api.post<AuthResponse>('/auth/login', data);
      logger.performanceEnd(perfId, 'login');
      logger.authSuccess('login', response.data.user);
      return response.data;
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
      const response = await this.api.post<AuthResponse>('/auth/register', data);
      logger.performanceEnd(perfId, 'register');
      logger.authSuccess('register', response.data.user);
      return response.data;
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
      const response = await this.api.get<Transaction[]>('/transactions');
      logger.performanceEnd(perfId, 'getTransactions');
      logger.info(`Fetched ${response.data.length} transactions`, { count: response.data.length }, 'TRANSACTIONS', 'GET_ALL_SUCCESS');
      return response.data;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'getTransactions');
      logger.error('Failed to fetch transactions', error, 'TRANSACTIONS', 'GET_ALL_ERROR');
      throw error;
    }
  }

  async getTransaction(id: string): Promise<Transaction> {
    const perfId = logger.performanceStart('getTransaction');
    try {
      logger.info('Fetching transaction', { id }, 'TRANSACTIONS', 'GET_ONE');
      const response = await this.api.get<Transaction>(`/transactions/${id}`);
      logger.performanceEnd(perfId, 'getTransaction');
      logger.info('Transaction fetched successfully', { id }, 'TRANSACTIONS', 'GET_ONE_SUCCESS');
      return response.data;
    } catch (error: any) {
      logger.performanceEnd(perfId, 'getTransaction');
      logger.error('Failed to fetch transaction', { id, error }, 'TRANSACTIONS', 'GET_ONE_ERROR');
      throw error;
    }
  }

  async createTransaction(data: TransactionCreateDto): Promise<Transaction> {
    const perfId = logger.performanceStart('createTransaction');
    try {
      logger.info('Creating transaction', { type: data.type, amount: data.amount, category: data.category }, 'TRANSACTIONS', 'CREATE');
      const response = await this.api.post<Transaction>('/transactions', data);
      logger.performanceEnd(perfId, 'createTransaction');
      logger.info('Transaction created successfully', { id: response.data.id }, 'TRANSACTIONS', 'CREATE_SUCCESS');
      return response.data;
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
      const response = await this.api.put<Transaction>(`/transactions/${id}`, data);
      logger.performanceEnd(perfId, 'updateTransaction');
      logger.info('Transaction updated successfully', { id }, 'TRANSACTIONS', 'UPDATE_SUCCESS');
      return response.data;
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