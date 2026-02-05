import { useState, useEffect } from 'react';
import { getToken } from '../services/auth';
import { fetchOrders, cancelOrder, fetchOrderStats } from '../services/api';
import type { Order } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FaBan, FaSearch, FaEye } from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import '../styles/Support.css';

const SupportDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [pagination, setPagination] = useState({ current: 1, totalPages: 1 });
    const [stats, setStats] = useState({ pending: 0, preparing: 0, ready: 0, out_for_delivery: 0, delivered: 0 });
    const [timeFilter, setTimeFilter] = useState('today');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });

    const navigate = useNavigate();

    useEffect(() => {
        loadData(1);
    }, [searchTerm, sortBy, sortOrder]);

    useEffect(() => {
        loadStats();
    }, [timeFilter]);

    const loadData = async (page: number = pagination.current) => {
        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }
            const response = await fetchOrders(page, 10, searchTerm, sortBy, sortOrder);
            setOrders(response.data);
            setPagination({ current: response.page, totalPages: response.totalPages });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
            setLoading(false);
        }
    };

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

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const handleCancelOrder = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order? This will trigger an automatic refund.',
            onConfirm: async () => {
                try {
                    await cancelOrder(id);
                    toast.success('Order cancelled successfully');
                    loadData();
                    loadStats(); 
                } catch (error: any) {
                    toast.error(error.message || 'Failed to cancel order');
                }
            }
        });
    };

    const Pagination = () => {
        if (pagination.totalPages <= 1) return null;
        return (
            <div className="pagination">
                <button 
                    disabled={pagination.current === 1} 
                    onClick={() => loadData(pagination.current - 1)}
                    className="pagination-btn"
                >
                    Prev
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                    <button 
                        key={i + 1} 
                        className={`pagination-btn ${i + 1 === pagination.current ? 'active' : ''}`}
                        onClick={() => loadData(i + 1)}
                    >
                        {i + 1}
                    </button>
                ))}
                <button 
                    disabled={pagination.current === pagination.totalPages} 
                    onClick={() => loadData(pagination.current + 1)}
                    className="pagination-btn"
                >
                    Next
                </button>
            </div>
        );
    };

    return (
        <div className="support-container">
            <header className="support-header">
                <h1>Support Portal</h1>
                <div className="support-filter-group">
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
                    <div className="support-search">
                        <FaSearch className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search name, email, phone or ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="support-stats">
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

            {loading ? (
                <div className="flex-center p-5"><div className="loader"></div></div>
            ) : (
                <div className="support-table-card">
                    <div className="support-table-wrapper">
                        <table className="support-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('id')} className="sortable">
                                        ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('customer')} className="sortable">
                                        Customer {sortBy === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('date')} className="sortable">
                                        Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Total</th>
                                    <th onClick={() => handleSort('status')} className="sortable">
                                        Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id}>
                                        <td className="fw-bold">#{order.id}</td>
                                        <td>
                                            <div className="customer-info">
                                                <div className="name">{order.customer.name}</div>
                                                <div className="email">{order.customer.email}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                {new Date(order.date || '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div style={{ fontSize: '0.85em', color: '#888' }}>
                                                {new Date(order.date || '').toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                                            </div>
                                        </td>
                                        <td className="fw-bold text-accent">${Number(order.total).toFixed(2)}</td>
                                        <td>
                                            <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s/g, '-')}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="icon-btn view" onClick={() => setSelectedOrder(order)} title="View Details">
                                                    <FaEye />
                                                </button>
                                                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                    <button className="icon-btn delete" onClick={() => handleCancelOrder(order.id!)} title="Cancel Order">
                                                        <FaBan />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination />
                </div>
            )}

            <OrderDetailsModal 
                isOpen={!!selectedOrder} 
                order={selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
            />

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

const OrderDetailsModal = ({ isOpen, order, onClose }: { isOpen: boolean, order: Order | null, onClose: () => void }) => {
    if (!order) return null;

    return (
        <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
            <motion.div 
                className="modal-content order-details-modal" 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <header className="modal-header">
                    <h2>Order Details #{order.id}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </header>

                <div className="modal-body">
                    <div className="modal-section">
                        <h3>Customer Information</h3>
                        <p><strong>Name:</strong> {order.customer.name}</p>
                        <p><strong>Email:</strong> {order.customer.email}</p>
                        <p><strong>Phone:</strong> {order.customer.phoneNo || 'N/A'}</p>
                        <p><strong>Address:</strong> {order.customer.address || 'N/A'}</p>
                    </div>

                    <div className="modal-section">
                        <h3>Order Items</h3>
                        <div className="items-list">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="item-row">
                                    <span>{item.quantity || 1}x {item.name}</span>
                                    <span>${(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="total-summary">
                        <div className="summary-row">
                            <span>Status</span>
                            <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s/g, '-')}`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>${Number(order.total).toFixed(2)}</span>
                        </div>
                        <div className="summary-row grand-total">
                            <span>Total</span>
                            <span>${Number(order.total).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SupportDashboard;
