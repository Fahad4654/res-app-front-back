import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchMyOrders, cancelOrder, deleteOrder } from '../services/api';
import type { Order } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { FaTrash } from 'react-icons/fa';
import CountdownTimer from './CountdownTimer';
import ConfirmModal from './ConfirmModal';
import '../styles/Admin.css'; // Reusing admin table styles for consistency

const MyOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersPage, setOrdersPage] = useState({ current: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });

    const loadOrders = async (page = 1) => {
        try {
            const res = await fetchMyOrders(page, 10, sortBy, sortOrder);
            setOrders(res.data);
            setOrdersPage({ current: res.page, totalPages: res.totalPages });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const navigate = useNavigate();

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }

        loadOrders(1);
    }, [navigate, sortBy, sortOrder]);

    if (loading) return <div className="loading">Loading your orders...</div>;

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

    const getSortedOrders = () => {
        // Sorting is now handled server-side.
        return orders;
    };

    const handleCancelOrder = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order?',
            onConfirm: async () => {
                try {
                    await cancelOrder(id);
                    loadOrders(ordersPage.current);
                    toast.success('Order cancelled successfully');
                } catch (error: any) {
                    toast.error(error.message || 'Failed to cancel order');
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
                    loadOrders(ordersPage.current);
                    toast.success('Order deleted successfully');
                } catch (error: any) {
                    toast.error(error.message || 'Failed to delete order');
                }
            }
        });
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

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    return (
        <div className="container admin-container">
            <h2 className="section-title">My <span className="text-accent">Orders</span></h2>
            
            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
                    <h3>No orders found</h3>
                    <p style={{ color: '#aaa', marginTop: '0.5rem' }}>You haven't placed any orders yet.</p>
                </div>
            ) : (
                <div className="orders-table-wrapper">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('id')} className="sortable">Order ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('date')} className="sortable">Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Items</th>
                                <th onClick={() => handleSort('total')} className="sortable">Total {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th onClick={() => handleSort('status')} className="sortable">Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedOrders().map(order => {
                                const displayItems = groupItems(order.items);

                                return (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>
                                            {new Date(order.date || '').toLocaleString()}
                                        </td>
                                        <td>
                                            <div className="small">
                                                {displayItems[0]?.name} {displayItems.length > 1 ? `+${displayItems.length - 1} more` : ''}
                                            </div>
                                        </td>
                                        <td className="text-accent fw-bold">${Number(order.total).toFixed(2)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className={`status-badge status-${(order.status || 'pending').toLowerCase()}`}>
                                                    {order.status}
                                                </span>
                                                {order.status === 'preparing' && order.estimatedReadyAt && (
                                                    <CountdownTimer 
                                                        targetDate={order.estimatedReadyAt} 
                                                        onEnd={() => loadOrders(ordersPage.current)} 
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button className="btn-small" onClick={() => setSelectedOrder(order)}>View Details</button>
                                                {order.status === 'pending' && (
                                                    <button className="btn-small btn-danger" onClick={() => handleCancelOrder(order.id!)} style={{ color: '#ff4d4d' }}>Cancel</button>
                                                )}
                                                {['pending', 'cancelled', 'delivered'].includes((order.status || '').toLowerCase()) && (
                                                    <button className="icon-btn delete" onClick={() => handleDeleteOrder(order.id!)} style={{ width: '30px', height: '30px', borderRadius: '6px' }} title="Delete Order">
                                                        <FaTrash style={{ width: '14px', height: '14px' }} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <Pagination 
                        current={ordersPage.current} 
                        totalPages={ordersPage.totalPages} 
                        onPageChange={(p) => loadOrders(p)} 
                    />
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
                            
                            <div className="detail-section">
                                <h4>Order Information</h4>
                                <div className="customer-card">
                                    <p><span>Date:</span> {new Date(selectedOrder.date || '').toLocaleString()}</p>
                                    <p><span>Status:</span> {selectedOrder.status}</p>
                                </div>
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
        </div>
    );
};

export default MyOrders;
