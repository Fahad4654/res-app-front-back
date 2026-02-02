export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  quantity?: number;
  createdAt?: string;
  avgRating?: number;
  reviewCount?: number;
  latestReviews?: Review[];
}

import type { User } from './auth';
export type { User };

export interface Order {
  id?: number;
  items: MenuItem[];
  total: number;
  customer: {
    name: string;
    email: string;
    phoneNo?: string;
    address?: string;
    profilePicture?: string;
    createdAt?: string;
  };
  status?: string;
  date?: string;
  estimatedReadyAt?: string;
  user?: User;
  kitchenStaff?: { name: string };
  deliveryStaff?: { name: string; phoneNo?: string };
  isDeletedByCustomer?: boolean;
  review?: Review;
}

export interface Review {
  id?: number;
  rating: number;
  comment?: string;
  createdAt?: string;
  isAccepted?: boolean;
  menuItemIds?: number[];
  taggedItems?: MenuItem[];
  user?: { name: string };
}

export interface Category {
  id: number;
  name: string;
  createdAt?: string;
}

export interface Permission {
  id: number;
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { getToken } from './auth';

export const fetchMenu = async (page = 1, limit = 10, category?: string, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedResponse<MenuItem>> => {
  let url = `${API_URL}/menu?page=${page}&limit=${limit}`;
  if (category && category !== 'All') url += `&category=${encodeURIComponent(category)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sortBy) url += `&sortBy=${sortBy}`;
  if (sortOrder) url += `&sortOrder=${sortOrder}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch menu');
  return response.json();
};

export const placeOrder = async (order: Order): Promise<{ message: string; orderId: number }> => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(order),
  });
  if (!response.ok) throw new Error('Failed to place order');
  return response.json();
};

export const fetchMyOrders = async (page = 1, limit = 10, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedResponse<Order>> => {
  const token = getToken();
  let url = `${API_URL}/orders/my-orders?page=${page}&limit=${limit}`;
  if (sortBy) url += `&sortBy=${sortBy}`;
  if (sortOrder) url += `&sortOrder=${sortOrder}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch your orders');
  return response.json();
};

export const fetchOrders = async (page = 1, limit = 10, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedResponse<Order>> => {
  const token = getToken();
  let url = `${API_URL}/orders?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sortBy) url += `&sortBy=${sortBy}`;
  if (sortOrder) url += `&sortOrder=${sortOrder}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
};

export const updateOrderStatus = async (id: number, status: string, estimatedTime?: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/orders/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status, estimatedTime })
  });
  if (!response.ok) throw new Error('Failed to update status');
};

export const cancelOrder = async (id: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/orders/${id}/cancel`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to cancel order');
  }
};

export const deleteOrder = async (id: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to delete order');
  }
};

export const createMenuItem = async (item: any): Promise<void> => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`
  };

  if (!(item instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    item = JSON.stringify(item);
  }

  const response = await fetch(`${API_URL}/menu`, {
    method: 'POST',
    headers,
    body: item
  });
  if (!response.ok) throw new Error('Failed to create item');
};

export const fetchCategories = async (page = 1, limit = 100, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedResponse<Category>> => {
  let url = `${API_URL}/categories?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sortBy) url += `&sortBy=${sortBy}`;
  if (sortOrder) url += `&sortOrder=${sortOrder}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch categories');
  return response.json();
};

export const createCategory = async (name: string): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to create category');
};

export const updateProfile = async (formData: FormData): Promise<{ message: string, user: User }> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return response.json();
};

export const fetchUsers = async (page = 1, limit = 10, search?: string, sortBy?: string, sortOrder?: 'asc' | 'desc'): Promise<PaginatedResponse<User>> => {
  const token = getToken();
  let url = `${API_URL}/users?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (sortBy) url += `&sortBy=${sortBy}`;
  if (sortOrder) url += `&sortOrder=${sortOrder}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const updateUser = async (id: number, data: any): Promise<User> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update user');
  return response.json();
};

export const deleteUser = async (id: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to delete user');
};

export const createUser = async (data: any): Promise<User> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create user');
  }
  return response.json();
};

export const updateMenuItem = async (id: number, data: FormData): Promise<MenuItem> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/menu/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: data
  });
  if (!response.ok) throw new Error('Failed to update menu item');
  return response.json();
};

export const deleteMenuItem = async (id: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/menu/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to delete item');
};

export const updateCategory = async (id: number, name: string): Promise<Category> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/categories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to update category');
  return response.json();
};

export const deleteCategory = async (id: number): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to delete category');
};

export const fetchPermissions = async (role?: string): Promise<Permission[]> => {
  const token = getToken();
  let url = `${API_URL}/permissions`;
  if (role) url += `/${role}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch permissions');
  return response.json();
};

export const updatePermissions = async (permissions: Partial<Permission>[]): Promise<void> => {
  const token = getToken();
  const response = await fetch(`${API_URL}/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ permissions })
  });
  if (!response.ok) throw new Error('Failed to update permissions');
};

// Reviews
export const createReview = async (reviewData: { orderId: number; rating: number; comment?: string }) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reviewData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to submit review');
    return data;
};

export const acceptReview = async (id: number, menuItemIds: number[]) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/reviews/${id}/accept`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ menuItemIds })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to accept review');
    return data;
};
