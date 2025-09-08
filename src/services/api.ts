import { useNotificationStore } from '@/stores/notification';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const SuccessCode = 0;

// 默认配置
const defaultConfig: ApiConfig = {
  baseUrl: 'https://transairobot.com/api',
  timeout: 5000, // 10秒
  retryAttempts: 2,
  retryDelay: 1000 // 1秒
};

// 当前配置
let currentConfig: ApiConfig = { ...defaultConfig };

// 设置配置
export const setApiConfig = (config: Partial<ApiConfig>) => {
  currentConfig = { ...currentConfig, ...config };
};

// 获取配置
export const getApiConfig = (): ApiConfig => {
  return { ...currentConfig };
};

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 显示错误通知
const showErrorNotification = (message: string) => {
  const notificationStore = useNotificationStore();
  notificationStore.showError(message);
};

// 通用请求函数
const request = async <T>(
  url: string,
  options: RequestInit
): Promise<T> => {
  // 合并选项和超时
  const fetchOptions: RequestInit = {
    ...options,
    signal: AbortSignal.timeout(currentConfig.timeout)
  };

  let lastError: Error | null = null;

  for (let i = 0; i <= currentConfig.retryAttempts; i++) {
    try {
      // 构造完整URL
      const fullUrl = currentConfig.baseUrl ? `${currentConfig.baseUrl}${url}` : url;

      const response = await fetch(fullUrl, fetchOptions);

      // 检查 HTTP 状态
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result: ApiResponse<T> = await response.json();

      // 检查业务状态码
      if (result.code !== SuccessCode) {
        throw new Error(result.message || 'Unknown error occurred');
      }

      return result.data;
    } catch (error) {
      lastError = error as Error;

      // 如果不是最后一次重试，等待后继续
      if (i < currentConfig.retryAttempts) {
        await delay(currentConfig.retryDelay * Math.pow(2, i)); // 指数退避
        continue;
      }

      // 最后一次重试仍然失败，显示错误通知
      const errorMessage = `API request failed after ${currentConfig.retryAttempts + 1} attempts: ${lastError.message}`;
      showErrorNotification(errorMessage);
      throw lastError;
    }
  }

  // 这行代码实际上不会执行到，只是为了满足 TypeScript 的要求
  throw lastError || new Error('Unknown error occurred');
};

// GET 请求
export const get = async <T>(url: string): Promise<T> => {
  const options: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  return request<T>(url, options);
};

// POST 请求
export const post = async <T>(url: string, data?: any): Promise<T> => {
  const options: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  };

  return request<T>(url, options);
};

// PUT 请求
export const put = async <T>(url: string, data?: any): Promise<T> => {
  const options: RequestInit = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  };

  return request<T>(url, options);
};