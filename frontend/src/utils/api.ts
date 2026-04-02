import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async init() {
    this.accessToken = await AsyncStorage.getItem('access_token');
    this.refreshToken = await AsyncStorage.getItem('refresh_token');
  }

  async setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.refreshToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access_token;
        await AsyncStorage.setItem('access_token', data.access_token);
        return true;
      }
    } catch {}
    return false;
  }

  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const { method = 'GET', body, headers = {} } = options;
    const url = `${API_BASE}/api${endpoint}`;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (this.accessToken) {
      reqHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Try refresh on 401
    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        reqHeaders['Authorization'] = `Bearer ${this.accessToken}`;
        res = await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });
      }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = errData.detail;
      let message: string;
      if (typeof detail === 'string') message = detail;
      else if (Array.isArray(detail)) message = detail.map((e: any) => e.msg || JSON.stringify(e)).join(' ');
      else message = `Request failed (${res.status})`;
      throw new Error(message);
    }

    return res.json();
  }

  get(endpoint: string) {
    return this.request(endpoint);
  }

  post(endpoint: string, body: any) {
    return this.request(endpoint, { method: 'POST', body });
  }

  put(endpoint: string, body: any) {
    return this.request(endpoint, { method: 'PUT', body });
  }

  del(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
