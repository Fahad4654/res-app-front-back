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
    createUser
} from '../services/api';
import type { Order, MenuItem, Category, User } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEdit, FaTrash } from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import InputModal from './InputModal';
import '../styles/Admin.css';

const AdminDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Pagination States
    const [ordersPage, setOrdersPage] = useState({ total: 0, current: 1, totalPages: 1 });
    const [menuPage, setMenuPage] = useState({ total: 0, current: 1, totalPages: 1 });
    const [usersPage, setUsersPage] = useState({ total: 0, current: 1, totalPages: 1 });
    const [categoriesPage, setCategoriesPage] = useState({ total: 0, current: 1, totalPages: 1 });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'categories' | 'users'>('orders');
    const [msg, setMsg] = useState({ type: '', text: '' });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

    // Refetch current tab when debounced search, active tab, or sorting changes
    useEffect(() => {
        if (debouncedSearch !== undefined) {
            loadTabData(activeTab, 1);
        }
    }, [debouncedSearch, activeTab, sortBy, sortOrder]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [ordersRes, menuRes, categoriesRes, usersRes] = await Promise.all([
                fetchOrders(1, 10, debouncedSearch, 'date', 'desc'),
                fetchMenu(1, 10, 'All', debouncedSearch, 'id', 'asc'),
                fetchCategories(1, 100, debouncedSearch, 'name', 'asc'),
                fetchUsers(1, 10, debouncedSearch, 'id', 'asc')
            ]);
            
            setOrders(ordersRes.data);
            setOrdersPage({ total: ordersRes.total, current: ordersRes.page, totalPages: ordersRes.totalPages });
            
            setMenuItems(menuRes.data);
            setMenuPage({ total: menuRes.total, current: menuRes.page, totalPages: menuRes.totalPages });
            
            setCategories(categoriesRes.data);
            setCategoriesPage({ total: categoriesRes.total, current: categoriesRes.page, totalPages: categoriesRes.totalPages });
            
            setUsers(usersRes.data);
            setUsersPage({ total: usersRes.total, current: usersRes.page, totalPages: usersRes.totalPages });
        } catch (error) {
            console.error(error);
            showMsg('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadTabData = async (tab: typeof activeTab, page: number) => {
        try {
            if (tab === 'orders') {
                const res = await fetchOrders(page, 10, debouncedSearch, sortBy, sortOrder);
                setOrders(res.data);
                setOrdersPage({ total: res.total, current: res.page, totalPages: res.totalPages });
            } else if (tab === 'menu') {
                const res = await fetchMenu(page, 10, 'All', debouncedSearch, sortBy, sortOrder);
                setMenuItems(res.data);
                setMenuPage({ total: res.total, current: res.page, totalPages: res.totalPages });
            } else if (tab === 'users') {
                const res = await fetchUsers(page, 10, debouncedSearch, sortBy, sortOrder);
                setUsers(res.data);
                setUsersPage({ total: res.total, current: res.page, totalPages: res.totalPages });
            } else if (tab === 'categories') {
                const res = await fetchCategories(page, 100, debouncedSearch, sortBy, sortOrder);
                setCategories(res.data);
                setCategoriesPage({ total: res.total, current: res.page, totalPages: res.totalPages });
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
        return items.reduce((acc: any[], item: any) => {
            const existing = acc.find(i => i.id === item.id);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
            } else {
                acc.push({ ...item, quantity: item.quantity || 1 });
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
            </div>

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
                <div className="orders-table-wrapper">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="sortable">ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('date')} className="sortable">Date & Time {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('customer')} className="sortable">Customer {sortBy === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('total')} className="sortable">Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} className="sortable">Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Details</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedItems(orders).map(order => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td className="small">
                                        {new Date(order.date || '').toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="fw-bold">{order.customer.name}</div>
                                        <div className="text-muted small">{order.customer.email}</div>
                                    </td>
                                    <td className="text-accent fw-bold">${Number(order.total).toFixed(2)}</td>
                                    <td>
                                        <span className={`status-badge status-${(order.status || 'pending').toLowerCase()}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions-cell">
                                            <button className="btn-small" onClick={() => setSelectedOrder(order)}>View</button>
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
                        <div className="admin-table-filters">
                            <input 
                                type="text" 
                                placeholder="Search menu items..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                className="admin-search-input"
                            />
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
                                        <td className="small">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
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

            {/* USERS TAB */}
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
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary">Create Account</button>
                        </form>
                    </div>

                    <div className="orders-table-wrapper">
                        <div className="admin-table-filters">
                            <input 
                                type="text" 
                                placeholder="Search users..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                className="admin-search-input"
                            />
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
                                        <td className="small">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
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
                                        <td className="small">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</td>
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
