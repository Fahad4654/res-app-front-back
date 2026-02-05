import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchMyOrders, cancelOrder, deleteOrder, createReview } from '../services/api';
import type { Order } from '../services/api';
import { getCurrentUser } from '../services/auth';
import { FaTrash, FaStar, FaRegStar, FaSearch } from 'react-icons/fa';
import CountdownTimer from './CountdownTimer';
import ConfirmModal from './ConfirmModal';
import '../styles/Admin.css';
import '../styles/MyOrders.css';

const MyOrders = () => {
    // ... (rest of state stays same)
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersPage, setOrdersPage] = useState({ current: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewingOrderId, setReviewingOrderId] = useState<number | null>(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [sortBy, setSortBy] = useState<string>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const navigate = useNavigate();

    const loadOrders = async (page = ordersPage.current) => {
        try {
            const res = await fetchMyOrders(page, rowsPerPage, searchTerm, sortBy, sortOrder);
            setOrders(res.data);
            setOrdersPage({ current: res.page, totalPages: res.totalPages, total: res.total });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }
        loadOrders(1);
    }, [navigate, sortBy, sortOrder, rowsPerPage, searchTerm]);

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

    const handleCancelOrder = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order?',
            onConfirm: async () => {
                try {
                    await cancelOrder(id);
                    loadOrders();
                    toast.success('Order cancelled successfully');
                } catch (error: any) {
                    toast.error(error.message || 'Failed to cancel order');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDeleteOrder = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Order',
            message: 'Are you sure you want to remove this order from your view?',
            onConfirm: async () => {
                try {
                    await deleteOrder(id);
                    loadOrders();
                    toast.success('Order removed successfully');
                } catch (error: any) {
                    toast.error(error.message || 'Failed to delete order');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleReviewSubmit = async () => {
        if (!reviewingOrderId) return;
        setIsSubmittingReview(true);
        try {
            await createReview({
                orderId: reviewingOrderId,
                rating,
                comment
            });
            toast.success('Review submitted successfully!');
            setIsReviewModalOpen(false);
            setReviewingOrderId(null);
            setRating(5);
            setComment('');
            loadOrders();
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit review');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const Pagination = () => {
        if (ordersPage.totalPages <= 1) return null;
        return (
            <div className="pagination">
                <button disabled={ordersPage.current === 1} onClick={() => loadOrders(ordersPage.current - 1)} className="pagination-btn">Prev</button>
                {[...Array(ordersPage.totalPages)].map((_, i) => (
                    <button key={i} className={`pagination-btn ${i + 1 === ordersPage.current ? 'active' : ''}`} onClick={() => loadOrders(i + 1)}>{i + 1}</button>
                ))}
                <button disabled={ordersPage.current === ordersPage.totalPages} onClick={() => loadOrders(ordersPage.current + 1)} className="pagination-btn">Next</button>
            </div>
        );
    };

    return (
        <div className="container my-orders-container">
            <header className="my-orders-header">
                <h2>My <span className="text-accent">Orders</span></h2>
                <div className="support-filter-group">
                    <div className="support-search">
                        <FaSearch className="search-icon" />
                        <input 
                            type="text" 
                            className="admin-search-input"
                            placeholder="Search orders..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="filter-select"
                        value={rowsPerPage} 
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    >
                        <option value="5">5 Per Page</option>
                        <option value="10">10 Per Page</option>
                        <option value="20">20 Per Page</option>
                        <option value="50">50 Per Page</option>
                    </select>
                </div>
            </header>

            {loading ? (
                <div className="flex-center p-5"><div className="loader"></div></div>
            ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem' }}>
                    <h3>No orders found</h3>
                    <p style={{ color: '#aaa', marginTop: '0.5rem' }}>Try adjusting your search or placing an order.</p>
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
                            {orders.map(order => {
                                const displayItems = groupItems(order.items);
                                return (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>
                                            <div>{new Date(order.date || '').toLocaleDateString()}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(order.date || '').toLocaleTimeString()}</div>
                                        </td>
                                        <td>{displayItems[0]?.name} {displayItems.length > 1 ? `+${displayItems.length - 1}` : ''}</td>
                                        <td className="text-accent fw-bold">${Number(order.total).toFixed(2)}</td>
                                        <td>
                                            <span className={`status-badge status-${(order.status || 'pending').toLowerCase()}`}>
                                                {(order.status || '').replace(/_/g, ' ').toUpperCase()}
                                            </span>
                                            {order.status === 'preparing' && order.estimatedReadyAt && (
                                                <CountdownTimer targetDate={order.estimatedReadyAt} onEnd={() => loadOrders()} />
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn-small" onClick={() => setSelectedOrder(order)}>View</button>
                                                {order.status === 'pending' && <button className="btn-small btn-danger" onClick={() => handleCancelOrder(order.id!)}>Cancel</button>}
                                                {order.status === 'delivered' && !order.review && <button className="btn-small btn-primary" onClick={() => { setReviewingOrderId(order.id!); setIsReviewModalOpen(true); }}>Rate</button>}
                                                {['pending', 'cancelled', 'delivered'].includes((order.status || '').toLowerCase()) && (
                                                    <button className="icon-btn delete" onClick={() => handleDeleteOrder(order.id!)}><FaTrash /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <Pagination />
                </div>
            )}

            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Order #{selectedOrder.id} Details</h3>
                            <button className="close-modal" onClick={() => setSelectedOrder(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-section">
                                <h4>Items</h4>
                                {groupItems(selectedOrder.items).map((item: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>{item.name} x {item.quantity}</span>
                                        <span>${(Number(item.price) * (item.quantity || 1)).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="detail-section" style={{ borderTop: '1px solid #333', paddingTop: '16px', marginTop: '16px' }}>
                                <p><strong>Status:</strong> {selectedOrder.status}</p>
                                <p><strong>Total:</strong> ${Number(selectedOrder.total).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isReviewModalOpen && (
                <div className="modal-overlay" onClick={() => setIsReviewModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Rate Your Order</h3>
                            <button className="close-modal" onClick={() => setIsReviewModalOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '2rem', marginBottom: '24px' }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} onClick={() => setRating(s)} style={{ cursor: 'pointer', color: s <= rating ? '#ffc107' : '#444' }}>
                                        {s <= rating ? <FaStar /> : <FaRegStar />}
                                    </span>
                                ))}
                            </div>
                            <textarea 
                                className="admin-form textarea" 
                                value={comment} 
                                onChange={e => setComment(e.target.value)} 
                                placeholder="Write a comment..."
                                style={{ width: '100%', height: '100px', padding: '12px' }}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleReviewSubmit} disabled={isSubmittingReview} style={{ width: '100%' }}>Submit</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                onConfirm={confirmModal.onConfirm} 
                onCancel={() => setConfirmModal(p => ({ ...p, isOpen: false }))} 
            />
        </div>
    );
};

export default MyOrders;
