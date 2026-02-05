import { useState, useEffect } from 'react';
import { 
    fetchOrders, 
    updateOrderStatus, 
    deleteOrder,
    fetchMenu, 
    createMenuItem, 
    updateMenuItem,
    deleteMenuItem,
    fetchCategories, 
    createCategory, 
    updateCategory,
    deleteCategory,
    fetchUsers,
    updateUser,
    deleteUser,
    createUser,
    fetchPermissions,
    updatePermissions,
    acceptReview,
    downloadInvoice,
    fetchOrderStats
} from '../services/api';
import type { Order, MenuItem, Category, User, Permission } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEdit, FaTrash, FaStar, FaCheckCircle, FaFilePdf, FaSearch } from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import InputModal from './InputModal';
import '../styles/Admin.css';

const AdminDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Pagination States
    const [ordersPage, setOrdersPage] = useState({ total: 0, current: 1, totalPages: 1, limit: 10 });
    const [menuPage, setMenuPage] = useState({ total: 0, current: 1, totalPages: 1, limit: 10 });
    const [usersPage, setUsersPage] = useState({ total: 0, current: 1, totalPages: 1, limit: 10 });
    const [categoriesPage, setCategoriesPage] = useState({ total: 0, current: 1, totalPages: 1, limit: 10 });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'categories' | 'users' | 'permissions'>('orders');
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);

    // Search & Sort States
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [sortBy, setSortBy] = useState<string>('id');

    // Editing State
    const [editingItem, setEditingItem] = useState<any>(null); // For generic edit forms

    // Menu Item Creation State
    const [newItem, setNewItem] = useState({
        name: '', description: '', price: '', category: '', image: ''
    });
    const [newItemImage, setNewItemImage] = useState<File | null>(null);
    const [useUrl, setUseUrl] = useState(false);

    // Stats State
    const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, out_for_delivery: 0, delivered: 0 });
    const [timeFilter, setTimeFilter] = useState('today');

    // New Category State
    const [newCatName, setNewCatName] = useState('');

    // New User State
    const [newUser, setNewUser] = useState({
        name: '', email: '', password: '', role: 'CUSTOMER'
    });

    // Modal States
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });
    const [inputModal, setInputModal] = useState<{ isOpen: boolean; title: string; message: string; defaultValue: string; onSubmit: (value: string) => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        defaultValue: '',
        onSubmit: () => {} 
    });
    const [selectedTagItems, setSelectedTagItems] = useState<number[]>([]);
    const [isAcceptingReview, setIsAcceptingReview] = useState(false);
    const navigate = useNavigate();

    // Debounced search term
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            navigate('/');
            return;
        }
        loadAllData();
    }, [navigate]);

    // Refetch current tab when debounced search, active tab, sorting, or limit changes
    useEffect(() => {
        if (debouncedSearch !== undefined) {
            loadTabData(activeTab, 1);
        }
    }, [debouncedSearch, activeTab, sortBy, sortOrder, ordersPage.limit, menuPage.limit, usersPage.limit, categoriesPage.limit]);

    useEffect(() => {
        setSelectedTagItems([]);
    }, [selectedOrder]);

    useEffect(() => {
        loadStats();
    }, [timeFilter]);

    const getDateRange = (filter: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let startDate = new Date(today);
        let endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 1);

        switch (filter) {
            case 'yesterday':
                startDate.setDate(startDate.getDate() - 1);
                endDate.setDate(endDate.getDate() - 1);
                break;
            case '7days':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30days':
                startDate.setDate(startDate.getDate() - 30);
                break;
            default: // today
                break;
        }
        return { 
            startDate: startDate.toISOString(), 
            endDate: endDate.toISOString() 
        };
    };

    const loadStats = async () => {
        try {
            const { startDate, endDate } = getDateRange(timeFilter);
            const data = await fetchOrderStats(startDate, endDate);
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [ordersRes, menuRes, categoriesRes, usersRes, permissionsRes, statsRes] = await Promise.all([
                fetchOrders(1, 10, debouncedSearch, 'date', 'desc'),
                fetchMenu(1, 10, 'All', debouncedSearch, 'id', 'asc'),
                fetchCategories(1, 100, debouncedSearch, 'name', 'asc'),
                fetchUsers(1, 10, debouncedSearch, 'id', 'asc'),
                fetchPermissions(),
                fetchOrderStats()
            ]);
            
            setOrders(ordersRes.data);
            setOrdersPage({ total: ordersRes.total, current: ordersRes.page, totalPages: ordersRes.totalPages, limit: ordersPage.limit });
            
            setMenuItems(menuRes.data);
            setMenuPage({ total: menuRes.total, current: menuRes.page, totalPages: menuRes.totalPages, limit: menuPage.limit });
            
            setCategories(categoriesRes.data);
            setCategoriesPage({ total: categoriesRes.total, current: categoriesRes.page, totalPages: categoriesRes.totalPages, limit: categoriesPage.limit });
            
            setUsers(usersRes.data);
            setUsersPage({ total: usersRes.total, current: usersRes.page, totalPages: usersRes.totalPages, limit: usersPage.limit });

            setPermissions(permissionsRes);
            setStats(statsRes);
        } catch (error) {
            console.error(error);
            showMsg('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadTabData = async (tab: string = activeTab, page: number = 1) => {
        try {
            if (tab === 'orders') {
                const res = await fetchOrders(page, ordersPage.limit, debouncedSearch, sortBy, sortOrder);
                setOrders(res.data);
                setOrdersPage({ total: res.total, current: res.page, totalPages: res.totalPages, limit: ordersPage.limit });
            } else if (tab === 'menu') {
                const res = await fetchMenu(page, menuPage.limit, 'All', debouncedSearch, sortBy, sortOrder);
                setMenuItems(res.data);
                setMenuPage({ total: res.total, current: res.page, totalPages: res.totalPages, limit: menuPage.limit });
            } else if (tab === 'users') {
                const res = await fetchUsers(page, usersPage.limit, debouncedSearch, sortBy, sortOrder);
                setUsers(res.data);
                setUsersPage({ total: res.total, current: res.page, totalPages: res.totalPages, limit: usersPage.limit });
            } else if (tab === 'categories') {
                const res = await fetchCategories(page, categoriesPage.limit, debouncedSearch, sortBy, sortOrder);
                setCategories(res.data);
                setCategoriesPage({ total: res.total, current: res.page, totalPages: res.totalPages, limit: categoriesPage.limit });
            }
 else if (tab === 'permissions') {
                const res = await fetchPermissions();
                setPermissions(res);
            }
        } catch (error) {
            console.error(error);
            showMsg('error', `Failed to load ${tab} data`);
        }
    };

    const showMsg = (type: 'error' | 'success', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    };

    const Pagination = ({ current, totalPages, onPageChange }: { current: number, totalPages: number, onPageChange: (p: number) => void }) => {
        if (totalPages <= 1) return null;
        
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }

        return (
            <div className="pagination">
                <button 
                    disabled={current === 1} 
                    onClick={() => onPageChange(current - 1)}
                    className="pagination-btn"
                >
                    Prev
                </button>
                {pages.map(p => (
                    <button 
                        key={p} 
                        className={`pagination-btn ${p === current ? 'active' : ''}`}
                        onClick={() => onPageChange(p)}
                    >
                        {p}
                    </button>
                ))}
                <button 
                    disabled={current === totalPages} 
                    onClick={() => onPageChange(current + 1)}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        );
    };

    const groupItems = (items: any[]) => {
        if (!items || !Array.isArray(items)) return [];
        return items.reduce((acc: any[], item: any) => {
            const itemId = Number(item.id);
            if (isNaN(itemId)) return acc;
            const existing = acc.find(i => Number(i.id) === itemId);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
            } else {
                acc.push({ ...item, id: itemId, quantity: item.quantity || 1 });
            }
            return acc;
        }, []);
    };

    // --- Actions ---

    const handleDeleteMenuItem = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Menu Item',
            message: 'Are you sure you want to delete this item?',
            onConfirm: async () => {
                try {
                    await deleteMenuItem(id);
                    setMenuItems(menuItems.filter(i => i.id !== id));
                    showMsg('success', 'Item deleted');
                } catch (error) {
                    showMsg('error', 'Failed to delete item');
                }
            }
        });
    };

    const handleDeleteCategory = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Category',
            message: 'Deleting a category will NOT delete items in it. Proceed?',
            onConfirm: async () => {
                try {
                    await deleteCategory(id);
                    setCategories(categories.filter(c => c.id !== id));
                    showMsg('success', 'Category deleted');
                } catch (error) {
                    showMsg('error', 'Failed to delete category');
                }
            }
        });
    };

    const handleDeleteUser = async (id: number) => {
        const currentAdmin = getCurrentUser();
        if (currentAdmin?.id === id) return showMsg('error', "You can't delete yourself!");
        setConfirmModal({
            isOpen: true,
            title: 'Delete User',
            message: 'Delete this user account?',
            onConfirm: async () => {
                try {
                    await deleteUser(id);
                    setUsers(users.filter(u => u.id !== id));
                    showMsg('success', 'User deleted');
                } catch (error) {
                    showMsg('error', 'Failed to delete user');
                }
            }
        });
    };

    const handleAcceptReview = async (reviewId: number) => {
        if (!reviewId) {
            showMsg('error', 'Review ID is missing');
            return;
        }
        setIsAcceptingReview(true);
        try {
            await acceptReview(reviewId, selectedTagItems);
            showMsg('success', 'Review accepted and tagged');
            loadTabData('orders', ordersPage.current);
            if (selectedOrder) {
                setSelectedOrder({
                    ...selectedOrder,
                    review: { ...selectedOrder.review!, isAccepted: true, menuItemIds: selectedTagItems }
                });
            }
        } catch (error: any) {
            showMsg('error', error.message || 'Failed to accept review');
        } finally {
            setIsAcceptingReview(false);
        }
    };

    const handleDeleteOrder = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Order',
            message: 'Are you sure you want to delete this order? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await deleteOrder(id);
                    setOrders(orders.filter(o => o.id !== id));
                    showMsg('success', 'Order deleted');
                } catch (error: any) {
                    showMsg('error', error.message || 'Failed to delete order');
                }
            }
        });
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        if (status === 'preparing') {
            setInputModal({
                isOpen: true,
                title: 'Set Preparation Time',
                message: 'Enter estimated preparation time in minutes:',
                defaultValue: '20',
                onSubmit: async (time: string) => {
                    const estimatedTime = parseInt(time);
                    if (isNaN(estimatedTime)) {
                        showMsg('error', 'Invalid time entered');
                        return;
                    }
                    try {
                        await updateOrderStatus(id, status, estimatedTime);
                        loadAllData();
                        showMsg('success', 'Order status updated');
                    } catch (error) {
                        showMsg('error', 'Failed to update status');
                    }
                }
            });
        } else {
            try {
                await updateOrderStatus(id, status);
                loadAllData();
                showMsg('success', 'Order status updated');
            } catch (error) {
                showMsg('error', 'Failed to update status');
            }
        }
    };

    const handlePromoteUser = async (id: number, currentRole: string) => {
        const newRole = currentRole === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
        try {
            await updateUser(id, { role: newRole });
            setUsers(users.map(u => u.id === id ? { ...u, role: newRole as any } : u));
            showMsg('success', `User role updated to ${newRole}`);
        } catch (error) { showMsg('error', 'Failed to update user role'); }
    };

    const handleDownloadInvoice = async (orderId: number) => {
        setInputModal({
            isOpen: true,
            title: 'Add Delivery Charge',
            message: 'Enter delivery charge amount (only for this memo):',
            defaultValue: '0',
            onSubmit: async (value: string) => {
                const charge = parseFloat(value) || 0;
                try {
                    await downloadInvoice(orderId, charge);
                    showMsg('success', 'Invoice downloaded successfully');
                } catch (error: any) {
                    showMsg('error', error.message || 'Failed to download invoice');
                }
            }
        });
    };

    const handleMenuSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', newItem.name);
        formData.append('description', newItem.description);
        formData.append('price', newItem.price);
        formData.append('category', newItem.category);
        if (newItemImage) formData.append('image', newItemImage);
        else if (useUrl) formData.append('imageUrl', newItem.image);

        try {
            if (editingItem) {
                await updateMenuItem(editingItem.id, formData);
                showMsg('success', 'Item updated');
            } else {
                await createMenuItem(formData);
                showMsg('success', 'Item created');
            }
            setNewItem({ name: '', description: '', price: '', category: '', image: '' });
            setNewItemImage(null);
            setEditingItem(null);
            loadAllData();
        } catch (error) { showMsg('error', 'Operation failed'); }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updateCategory(editingItem.id, newCatName);
                showMsg('success', 'Category updated');
            } else {
                await createCategory(newCatName);
                showMsg('success', 'Category created');
            }
            setNewCatName('');
            setEditingItem(null);
            loadAllData();
        } catch (error) { showMsg('error', 'Operation failed'); }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUser(newUser);
            showMsg('success', 'User created successfully');
            setNewUser({ name: '', email: '', password: '', role: 'CUSTOMER' });
            loadAllData();
        } catch (error: any) {
            showMsg('error', error.message || 'Failed to create user');
        }
    };

    const handlePermissionToggle = async (role: string, resource: string, action: string, allowed: boolean) => {
        // Optimistic update
        const updatedPermissions = permissions.map(p => 
            p.role === role && p.resource === resource && p.action === action
                ? { ...p, allowed }
                : p
        );
        
        // If permission doesn't exist in array, add it
        if (!updatedPermissions.find(p => p.role === role && p.resource === resource && p.action === action)) {
            updatedPermissions.push({ id: 0, role, resource, action, allowed });
        }
        
        setPermissions(updatedPermissions);

        try {
            await updatePermissions([{ role, resource, action, allowed }]);
            showMsg('success', 'Permission updated');
        } catch (error) {
            console.error(error);
            showMsg('error', 'Failed to update permission');
            // Revert on error
            loadTabData('permissions', 1);
        }
    };

    // --- Helper Logic for Sorting & Filtering ---

    const getSortedItems = (items: any[]) => {
        // Sorting is now handled server-side.
        return items;
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    if (loading) return <div className="loading">Loading Admin Control Panel...</div>;

    return (
        <div className="container admin-container" style={{ paddingBottom: '4rem' }}>
            <h2 className="section-title">Admin <span className="text-accent">Control Panel</span></h2>
            
            {msg.text && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`admin-msg ${msg.type}`}>
                    {msg.text}
                </motion.div>
            )}

            <div className="admin-tabs">
                <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => {setActiveTab('orders'); setEditingItem(null); setSortBy('id'); setSortOrder('desc'); setSearchTerm('')}}>Orders</button>
                <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => {setActiveTab('menu'); setEditingItem(null); setSortBy('name'); setSortOrder('asc'); setSearchTerm('')}}>Menu</button>
                <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => {setActiveTab('categories'); setEditingItem(null); setSearchTerm('')}}>Categories</button>
                <button className={activeTab === 'users' ? 'active' : ''} onClick={() => {setActiveTab('users'); setEditingItem(null); setSortBy('name'); setSortOrder('asc'); setSearchTerm('')}}>Users</button>
                <button className={activeTab === 'permissions' ? 'active' : ''} onClick={() => {setActiveTab('permissions'); setEditingItem(null); setSearchTerm('')}}>Permissions</button>
            </div>

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
                <div className="orders-table-wrapper">
                    <div className="support-filter-group" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start' }}>
                        <div className="support-search">
                            <FaSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search name, email, phone or ID..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                className="admin-search-input"
                            />
                        </div>
                        <select 
                            className="filter-select" 
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                        </select>
                        <select 
                            className="filter-select" 
                            style={{ height: 'var(--control-height)' }}
                            value={activeTab === 'orders' ? ordersPage.limit : activeTab === 'menu' ? menuPage.limit : activeTab === 'users' ? usersPage.limit : categoriesPage.limit}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                if (activeTab === 'orders') setOrdersPage(p => ({ ...p, limit: val, current: 1 }));
                                else if (activeTab === 'menu') setMenuPage(p => ({ ...p, limit: val, current: 1 }));
                                else if (activeTab === 'users') setUsersPage(p => ({ ...p, limit: val, current: 1 }));
                                else if (activeTab === 'categories') setCategoriesPage(p => ({ ...p, limit: val, current: 1 }));
                            }}
                        >
                            <option value="5">5 Per Page</option>
                            <option value="10">10 Per Page</option>
                            <option value="20">20 Per Page</option>
                            <option value="50">50 Per Page</option>
                        </select>
                    </div>

                    <div className="support-stats" style={{ marginBottom: '2rem' }}>
                        <div className="stat-card">
                            <span className="stat-label">Pending</span>
                            <span className="stat-value" style={{ color: '#e74c3c' }}>{stats.pending || 0}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Preparing</span>
                            <span className="stat-value" style={{ color: '#f39c12' }}>{stats.preparing || 0}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Ready</span>
                            <span className="stat-value" style={{ color: '#27ae60' }}>{stats.ready || 0}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">On Route</span>
                            <span className="stat-value" style={{ color: '#9b59b6' }}>{stats.out_for_delivery || 0}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Delivered</span>
                            <span className="stat-value" style={{ color: '#2ecc71' }}>{stats.delivered || 0}</span>
                        </div>
                    </div>

                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="sortable">ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('date')} className="sortable">Date & Time {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('customer')} className="sortable">Customer {sortBy === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('total')} className="sortable">Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} className="sortable">Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Kitchen Staff</th>
                                <th>Delivery Staff</th>
                                <th>Details</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedItems(orders).map(order => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td className="small">
                                        <div>
                                            {new Date(order.date || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div style={{ fontSize: '0.85em', color: '#888' }}>
                                            {new Date(order.date || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="fw-bold">{order.customer.name}</div>
                                        <div className="text-muted small">{order.customer.email}</div>
                                    </td>
                                    <td className="text-accent fw-bold">${Number(order.total).toFixed(2)}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span className={`status-badge status-${(order.status || 'pending').toLowerCase()}`}>
                                                {order.status}
                                            </span>
                                            {order.isDeletedByCustomer && (
                                                <span className="status-badge" style={{ background: '#333', color: '#888', fontSize: '0.7rem' }}>CUSTOMER DELETED</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{order.kitchenStaff?.name || '-'}</td>
                                    <td>{order.deliveryStaff?.name || '-'}</td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-small" onClick={() => setSelectedOrder(order)}>View</button>
                                            <button 
                                                className="icon-btn" 
                                                onClick={() => handleDownloadInvoice(order.id!)} 
                                                style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--color-accent)' }} 
                                                title="Download Invoice"
                                            >
                                                <FaFilePdf style={{ width: '14px', height: '14px' }} />
                                            </button>
                                            {['pending', 'cancelled', 'delivered'].includes((order.status || '').toLowerCase()) && (
                                                <button className="icon-btn delete" onClick={() => handleDeleteOrder(order.id!)} style={{ width: '30px', height: '30px', borderRadius: '6px' }} title="Delete Order">
                                                    <FaTrash style={{ width: '14px', height: '14px' }} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => handleStatusUpdate(order.id!, e.target.value)}
                                            className="status-select"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="preparing">Preparing</option>
                                            <option value="ready">Ready</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Pagination 
                        current={ordersPage.current} 
                        totalPages={ordersPage.totalPages} 
                        onPageChange={(p) => loadTabData('orders', p)} 
                    />
                </div>
            )}

            {/* MENU TAB */}
            {activeTab === 'menu' && (
                <div className="admin-grid-two-cols">
                    <div className="admin-card">
                        <h3>{editingItem ? 'Edit Menu Item' : 'Add New Item'}</h3>
                        <form onSubmit={handleMenuSubmit} className="admin-form">
                            <div className="form-group">
                                <label>Item Name</label>
                                <input type="text" placeholder="e.g. Special Pepperoni Pizza" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                            </div>

                            <div className="form-group">
                                <label>Price ($)</label>
                                <input type="number" placeholder="0.00" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="toggle-label">
                                    <input type="checkbox" checked={useUrl} onChange={e => setUseUrl(e.target.checked)} /> 
                                    Use Image URL instead of upload
                                </label>
                                {useUrl ? (
                                    <input type="text" placeholder="https://example.com/image.jpg" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                                ) : (
                                    <input type="file" accept="image/*" onChange={e => setNewItemImage(e.target.files ? e.target.files[0] : null)} />
                                )}
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea placeholder="Describe the flavors and ingredients..." rows={3} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}></textarea>
                            </div>

                            <div className="btn-group">
                                <button type="submit" className="btn btn-primary">{editingItem ? 'Save Changes' : 'Create Item'}</button>
                                {editingItem && (
                                    <button type="button" className="btn btn-secondary" onClick={() => {
                                        setEditingItem(null); 
                                        setNewItem({name:'',description:'',price:'',category:'',image:''});
                                    }}>Cancel</button>
                                )}
                            </div>
                        </form>
                    </div>
                    <div className="orders-table-wrapper">
                        <div className="support-filter-group" style={{ marginBottom: '1.5rem' }}>
                            <div className="support-search" style={{ flexGrow: 1 }}>
                                <FaSearch className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search menu items..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="admin-search-input"
                                />
                            </div>
                            <select 
                                className="filter-select" 
                                value={menuPage.limit}
                                onChange={(e) => setMenuPage(p => ({ ...p, limit: Number(e.target.value), current: 1 }))}
                            >
                                <option value="5">5 Per Page</option>
                                <option value="10">10 Per Page</option>
                                <option value="20">20 Per Page</option>
                                <option value="50">50 Per Page</option>
                            </select>
                        </div>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th onClick={() => handleSort('name')} className="sortable">Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('price')} className="sortable">Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('createdAt')} className="sortable">Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedItems(menuItems).map(item => (
                                    <tr key={item.id}>
                                        <td><img src={item.image} style={{width:'40px',height:'40px',borderRadius:'4px',objectFit:'cover'}} alt="" /></td>
                                        <td>{item.name}</td>
                                        <td>${item.price}</td>
                                        <td className="small">
                                            <div>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                            </div>
                                            <div style={{ fontSize: '0.85em', color: '#888' }}>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : ''}
                                            </div>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="icon-btn edit" onClick={() => {setEditingItem(item); setNewItem({name:item.name, description:item.description, price:item.price.toString(), category:item.category, image:item.image}); setUseUrl(true)}}><FaEdit /></button>
                                            <button className="icon-btn delete" onClick={() => handleDeleteMenuItem(item.id)}><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination 
                            current={menuPage.current} 
                            totalPages={menuPage.totalPages} 
                            onPageChange={(p) => loadTabData('menu', p)} 
                        />
                    </div>
                </div>
            )}

            {/* PERMISSIONS TAB */}
            {activeTab === 'permissions' && (
                <div className="admin-card">
                    <h3>Role Permissions Management</h3>
                    <p className="text-muted mb-4">Manage access control for different user roles.</p>
                    
                    <div className="orders-table-wrapper">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Role / Resource</th>
                                    <th>Action</th>
                                    <th>Access</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { role: 'KITCHEN_STAFF', label: 'Kitchen Staff' },
                                    { role: 'DELIVERY_STAFF', label: 'Delivery Staff' },
                                    { role: 'CUSTOMER_SUPPORT', label: 'Customer Support' }
                                ].map(roleGroup => (
                                    <>
                                        <tr className="table-section-header" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <td colSpan={3} className="fw-bold text-accent py-3">{roleGroup.label}</td>
                                        </tr>
                                        {[
                                            { resource: 'orders', action: 'view', label: 'View Orders' },
                                            { resource: 'orders', action: 'update', label: 'Update Orders' },
                                            { resource: 'orders', action: 'delete', label: 'Delete Orders' },
                                            { resource: 'menu', action: 'view', label: 'View Menu' },
                                            { resource: 'users', action: 'view', label: 'View Users' }
                                        ].map((perm) => {
                                            const permission = permissions.find(p => 
                                                p.role === roleGroup.role && 
                                                p.resource === perm.resource && 
                                                p.action === perm.action
                                            );
                                            const isAllowed = permission?.allowed || false;
                                            
                                            return (
                                                <tr key={`${roleGroup.role}-${perm.resource}-${perm.action}`}>
                                                    <td style={{ paddingLeft: '2rem' }}>{perm.label} (Resource: {perm.resource})</td>
                                                    <td>{perm.action}</td>
                                                    <td>
                                                        <label className="switch">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isAllowed} 
                                                                onChange={(e) => handlePermissionToggle(roleGroup.role, perm.resource, perm.action, e.target.checked)}
                                                            />
                                                            <span className="slider round"></span>
                                                        </label>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {activeTab === 'users' && (
                <div className="admin-grid-two-cols">
                    <div className="admin-card">
                        <h3>Create New User</h3>
                        <form onSubmit={handleUserSubmit} className="admin-form">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" placeholder="John Doe" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" placeholder="john@example.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                    <option value="CUSTOMER">Customer</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="KITCHEN_STAFF">Kitchen Staff</option>
                                    <option value="DELIVERY_STAFF">Delivery Staff</option>
                                    <option value="CUSTOMER_SUPPORT">Customer Support</option>
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary">Create Account</button>
                        </form>
                    </div>

                    <div className="orders-table-wrapper">
                        <div className="support-filter-group" style={{ marginBottom: '1.5rem' }}>
                            <div className="support-search" style={{ flexGrow: 1 }}>
                                <FaSearch className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="admin-search-input"
                                />
                            </div>
                            <select 
                                className="filter-select" 
                                value={usersPage.limit}
                                onChange={(e) => setUsersPage(p => ({ ...p, limit: Number(e.target.value), current: 1 }))}
                            >
                                <option value="5">5 Per Page</option>
                                <option value="10">10 Per Page</option>
                                <option value="20">20 Per Page</option>
                                <option value="50">50 Per Page</option>
                            </select>
                        </div>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('name')} className="sortable">Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('email')} className="sortable">Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th onClick={() => handleSort('role')} className="sortable">Role {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th>Phone</th>
                                    <th onClick={() => handleSort('createdAt')} className="sortable">Joined {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getSortedItems(users).map(u => (
                                    <tr key={u.id}>
                                        <td className="fw-bold">{u.name}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={`status-badge status-${u.role.toLowerCase()}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>{u.phoneNo || '-'}</td>
                                        <td className="small">
                                            <div>
                                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                            </div>
                                            <div style={{ fontSize: '0.85em', color: '#888' }}>
                                                {u.createdAt ? new Date(u.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : ''}
                                            </div>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="btn-small" onClick={() => handlePromoteUser(u.id, u.role)}>
                                                {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                                            </button>
                                            <button className="icon-btn delete" onClick={() => handleDeleteUser(u.id)}><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination 
                            current={usersPage.current} 
                            totalPages={usersPage.totalPages} 
                            onPageChange={(p) => loadTabData('users', p)} 
                        />
                    </div>
                </div>
            )}

            {/* CATEGORIES TAB */}
            {activeTab === 'categories' && (
                <div className="admin-grid-two-cols">
                    <div className="admin-card">
                        <h3>{editingItem ? 'Edit Category' : 'New Category'}</h3>
                        <form onSubmit={handleCategorySubmit} className="admin-form">
                            <input type="text" placeholder="Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
                            <div className="btn-group">
                                <button type="submit" className="btn btn-primary">{editingItem ? 'Update' : 'Add'}</button>
                                {editingItem && <button type="button" className="btn btn-secondary" onClick={() => {setEditingItem(null); setNewCatName('')}}>Cancel</button>}
                            </div>
                        </form>
                    </div>
                    <div className="orders-table-wrapper">
                        <div className="support-filter-group" style={{ marginBottom: '1.5rem' }}>
                            <div className="support-search" style={{ flexGrow: 1 }}>
                                <FaSearch className="search-icon" />
                                <input 
                                    type="text" 
                                    placeholder="Search categories..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="admin-search-input"
                                />
                            </div>
                            <select 
                                className="filter-select" 
                                value={categoriesPage.limit}
                                onChange={(e) => setCategoriesPage(p => ({ ...p, limit: Number(e.target.value), current: 1 }))}
                            >
                                <option value="5">5 Per Page</option>
                                <option value="10">10 Per Page</option>
                                <option value="20">20 Per Page</option>
                                <option value="50">50 Per Page</option>
                            </select>
                        </div>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th onClick={() => handleSort('createdAt')} className="sortable">Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(c => (
                                    <tr key={c.id}>
                                        <td>{c.name}</td>
                                        <td className="small">
                                            <div>
                                                {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                                            </div>
                                            <div style={{ fontSize: '0.85em', color: '#888' }}>
                                                {c.createdAt ? new Date(c.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : ''}
                                            </div>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="icon-btn edit" onClick={() => {setEditingItem(c); setNewCatName(c.name)}}><FaEdit /></button>
                                            <button className="icon-btn delete" onClick={() => handleDeleteCategory(c.id)}><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination 
                            current={categoriesPage.current} 
                            totalPages={categoriesPage.totalPages} 
                            onPageChange={(p) => loadTabData('categories', p)} 
                        />
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Order #{selectedOrder.id} Details</h3>
                            <button className="close-modal" onClick={() => setSelectedOrder(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h4>Customer Information</h4>
                                <div className="customer-card">
                                    <p><span>Name:</span> {selectedOrder.customer.name}</p>
                                    <p><span>Email:</span> {selectedOrder.customer.email}</p>
                                    <p><span>Phone:</span> {selectedOrder.customer.phoneNo}</p>
                                    <p><span>Address:</span> {selectedOrder.customer.address}</p>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Items Ordered</h4>
                                {groupItems(selectedOrder.items).map((item: any, idx: number) => (
                                    <div key={idx} className="detail-item-row">
                                        <div className="detail-item-info">
                                            <span className="detail-item-name">{item.name}</span>
                                            <span className="detail-item-qty">Quantity: {item.quantity}</span>
                                        </div>
                                        <span className="detail-item-price">${(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            {selectedOrder.review && (
                                <div className="detail-section">
                                    <h4>Customer Review</h4>
                                    <div className="customer-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ color: '#ffc107' }}>
                                                {[...Array(5)].map((_, i) => (
                                                    <FaStar key={i} style={{ color: i < selectedOrder.review!.rating ? '#ffc107' : '#444' }} />
                                                ))}
                                            </div>
                                            {selectedOrder.review.isAccepted && (
                                                <span style={{ color: '#4caf50', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <FaCheckCircle /> ACCEPTED & TAGGED
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                            <p className="small mb-2 fw-bold">
                                                {selectedOrder.review.isAccepted ? 'Manage Tags:' : 'Tag this review to items:'}
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                {groupItems(selectedOrder.items).map((item: any) => {
                                                    const idNum = Number(item.id);
                                                    const isSelected = selectedTagItems.includes(idNum);
                                                    return (
                                                        <div 
                                                            key={idNum} 
                                                            className="tag-chip" 
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedTagItems(selectedTagItems.filter(id => id !== idNum));
                                                                } else {
                                                                    setSelectedTagItems([...selectedTagItems, idNum]);
                                                                }
                                                            }}
                                                            style={{ 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '8px', 
                                                                padding: '8px 16px', 
                                                                background: isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                                                                border: `1px solid ${isSelected ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)'}`,
                                                                borderRadius: '50px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.85rem',
                                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                color: isSelected ? '#000' : '#fff',
                                                                fontWeight: isSelected ? '600' : '400'
                                                            }}
                                                        >
                                                            {isSelected && <FaCheckCircle style={{ fontSize: '0.8rem' }} />}
                                                            {item.name}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button 
                                                className={`btn btn-primary ${isAcceptingReview ? 'disabled' : ''}`}
                                                onClick={() => {
                                                    if (selectedOrder.review?.id) {
                                                        handleAcceptReview(selectedOrder.review.id);
                                                    } else {
                                                        showMsg('error', 'Review ID is missing from order data');
                                                    }
                                                }}
                                                disabled={isAcceptingReview}
                                                style={{ 
                                                    width: '100%', 
                                                    opacity: isAcceptingReview ? 0.5 : 1,
                                                    cursor: isAcceptingReview ? 'not-allowed' : 'pointer',
                                                    filter: isAcceptingReview ? 'grayscale(0.5)' : 'none'
                                                }}
                                            >
                                                {isAcceptingReview ? 'Processing...' : (selectedOrder.review.isAccepted ? 'Update Tags' : 'Accept & Tag to Menu')}
                                            </button>
                                        </div>

                                        <p className="small text-muted" style={{ marginTop: '16px' }}>
                                            Review Date: {new Date(selectedOrder.review.createdAt || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(selectedOrder.review.createdAt || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <span className="total-label">Total Amount</span>
                            <span className="total-amount">${Number(selectedOrder.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            <InputModal 
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                message={inputModal.message}
                defaultValue={inputModal.defaultValue}
                onSubmit={inputModal.onSubmit}
                onCancel={() => setInputModal({ ...inputModal, isOpen: false })}
                inputType="number"
            />
        </div>
    );
};

export default AdminDashboard;
