// src/utils/logger.ts

// Log seviyesi enum'ı
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
  }
  
  // Log entry interface'i
  interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
    component?: string;
    action?: string;
    userId?: string;
  }
  
  class Logger {
    private logLevel: LogLevel;
    private logs: LogEntry[] = [];
    private maxLogs: number = 1000; // Maximum log entries to keep in memory
  
    constructor(level: LogLevel = LogLevel.DEBUG) {
      this.logLevel = level;
    }
  
    // Private method to create log entry
    private createLogEntry(level: LogLevel, message: string, data?: any, component?: string, action?: string): LogEntry {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        component,
        action,
        userId: this.getCurrentUserId()
      };
  
      // Add to in-memory logs
      this.logs.push(entry);
      
      // Keep only recent logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
  
      return entry;
    }
  
    // Get current user ID from localStorage
    private getCurrentUserId(): string | undefined {
      try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user).id : undefined;
      } catch {
        return undefined;
      }
    }
  
    // Format log for console output
    private formatLogForConsole(entry: LogEntry): void {
      const { timestamp, level, message, data, component, action, userId } = entry;
      
      const levelName = LogLevel[level];
      const timeStr = new Date(timestamp).toLocaleTimeString();
      
      let logMessage = `[${timeStr}] ${levelName}`;
      
      if (component) logMessage += ` [${component}]`;
      if (action) logMessage += ` [${action}]`;
      if (userId) logMessage += ` [User:${userId.substring(0, 8)}...]`;
      
      logMessage += `: ${message}`;
  
      // Use appropriate console method based on level
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(logMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(logMessage, data || '');
          break;
        case LogLevel.ERROR:
          console.error(logMessage, data || '');
          break;
      }
    }
  
    // Public logging methods
    debug(message: string, data?: any, component?: string, action?: string): void {
      if (this.logLevel <= LogLevel.DEBUG) {
        const entry = this.createLogEntry(LogLevel.DEBUG, message, data, component, action);
        this.formatLogForConsole(entry);
      }
    }
  
    info(message: string, data?: any, component?: string, action?: string): void {
      if (this.logLevel <= LogLevel.INFO) {
        const entry = this.createLogEntry(LogLevel.INFO, message, data, component, action);
        this.formatLogForConsole(entry);
      }
    }
  
    warn(message: string, data?: any, component?: string, action?: string): void {
      if (this.logLevel <= LogLevel.WARN) {
        const entry = this.createLogEntry(LogLevel.WARN, message, data, component, action);
        this.formatLogForConsole(entry);
      }
    }
  
    error(message: string, data?: any, component?: string, action?: string): void {
      if (this.logLevel <= LogLevel.ERROR) {
        const entry = this.createLogEntry(LogLevel.ERROR, message, data, component, action);
        this.formatLogForConsole(entry);
      }
    }
  
    // API specific logging methods
    apiRequest(method: string, url: string, data?: any): void {
      this.info(`API Request: ${method.toUpperCase()} ${url}`, data, 'API', 'REQUEST');
    }
  
    apiResponse(method: string, url: string, status: number, data?: any): void {
      const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
      const message = `API Response: ${method.toUpperCase()} ${url} - Status: ${status}`;
      
      if (level === LogLevel.ERROR) {
        this.error(message, data, 'API', 'RESPONSE');
      } else {
        this.info(message, data, 'API', 'RESPONSE');
      }
    }
  
    // Component lifecycle logging
    componentMount(componentName: string, props?: any): void {
      this.debug(`Component mounted: ${componentName}`, props, componentName, 'MOUNT');
    }
  
    componentUnmount(componentName: string): void {
      this.debug(`Component unmounted: ${componentName}`, undefined, componentName, 'UNMOUNT');
    }
  
    // User action logging
    userAction(action: string, component: string, data?: any): void {
      this.info(`User action: ${action}`, data, component, 'USER_ACTION');
    }
  
    // Navigation logging
    navigation(from: string, to: string): void {
      this.info(`Navigation: ${from} → ${to}`, undefined, 'ROUTER', 'NAVIGATE');
    }
  
    // Auth logging
    authSuccess(action: string, user?: any): void {
      this.info(`Auth success: ${action}`, { userId: user?.id, email: user?.email }, 'AUTH', action.toUpperCase());
    }
  
    authError(action: string, error: any): void {
      this.error(`Auth error: ${action}`, error, 'AUTH', action.toUpperCase());
    }
  
    // Performance logging
    performanceStart(operation: string): string {
      const id = `${operation}_${Date.now()}`;
      this.debug(`Performance start: ${operation}`, { id }, 'PERFORMANCE', 'START');
      return id;
    }
  
    performanceEnd(id: string, operation: string): void {
      const endTime = Date.now();
      const startTime = parseInt(id.split('_')[1]);
      const duration = endTime - startTime;
      
      this.info(`Performance end: ${operation} - Duration: ${duration}ms`, { duration }, 'PERFORMANCE', 'END');
    }
  
    // Get logs for debugging
    getLogs(component?: string, level?: LogLevel): LogEntry[] {
      let filteredLogs = this.logs;
  
      if (component) {
        filteredLogs = filteredLogs.filter(log => log.component === component);
      }
  
      if (level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= level);
      }
  
      return filteredLogs;
    }
  
    // Export logs as JSON for debugging
    exportLogs(): string {
      return JSON.stringify(this.logs, null, 2);
    }
  
    // Clear logs
    clearLogs(): void {
      this.logs = [];
      this.info('Logs cleared', undefined, 'LOGGER', 'CLEAR');
    }
  
    // Change log level
    setLogLevel(level: LogLevel): void {
      this.logLevel = level;
      this.info(`Log level changed to: ${LogLevel[level]}`, undefined, 'LOGGER', 'CONFIG');
    }
  }
  
  // Create singleton instance
  export const logger = new Logger(
    process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
  );
  
  // Export logger instance as default
  export default logger;