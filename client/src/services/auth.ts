const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN' | 'KITCHEN_STAFF' | 'DELIVERY_STAFF' | 'CUSTOMER_SUPPORT';
    phoneNo?: string;
    address?: string;
    profilePicture?: string;
    createdAt?: string;
}

interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
}

export const register = async (userData: any): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data;
};

export const login = async (credentials: any): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
};

export const logout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        await fetch(`${API_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        }).catch(err => console.error('Logout failed', err));
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

export const isValidSession = (): boolean => {
    const token = getToken();
    const user = getCurrentUser();
    return !!(user && token && !isTokenExpired(token));
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem('refreshToken');
};

export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
    } catch (e) {
        return true;
    }
};

export const saveAuth = (data: { token?: string; refreshToken?: string; user?: User }) => {
    if (data.token) localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
};

export const refreshAccessToken = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
        const response = await fetch(`${API_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        
        if (!response.ok) {
            // If refresh fails, logout
            await logout();
            return null;
        }

        const data = await response.json();
        localStorage.setItem('token', data.token);
        return data.token;
    } catch (error) {
        console.error('Refresh token failed', error);
        await logout();
        return null;
    }
};
