const API_URL = 'http://localhost:5000/api/auth';

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

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

export const saveAuth = (data: AuthResponse) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
};
