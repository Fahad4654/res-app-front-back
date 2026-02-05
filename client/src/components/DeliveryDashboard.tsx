import { useState, useEffect } from 'react';
import { updateOrderStatus, fetchDeliveryOrders } from '../services/api';
import type { Order } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FaPhone, FaMapMarkerAlt, FaCheck, FaMotorcycle, FaSearch } from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import '../styles/Delivery.css';

const DeliveryDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ current: 1, totalPages: 1, limit: 10, total: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });

    useEffect(() => {
        loadData(1);
        const interval = setInterval(() => loadData(pagination.current), 30000);
        return () => clearInterval(interval);
    }, [searchTerm, sortBy, sortOrder, pagination.limit]);

    const loadData = async (page: number = pagination.current) => {
        try {
            const res = await fetchDeliveryOrders(page, pagination.limit, searchTerm, sortBy, sortOrder);
            setOrders(res.data);
            setPagination(prev => ({ ...prev, current: res.page, totalPages: res.totalPages, total: res.total }));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching delivery orders:', error);
            toast.error('Failed to update orders');
            setLoading(false);
        }
    };

    const handleDeliveryComplete = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Complete Delivery',
            message: 'Confirm delivery complete?',
            onConfirm: async () => {
                try {
                    await updateOrderStatus(id, 'delivered');
                    toast.success('Order delivered!');
                    loadData();
                } catch (error) {
                    console.error(error);
                    toast.error('Failed to update status');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const Pagination = () => {
        if (pagination.totalPages <= 1) return null;
        return (
            <div className="pagination delivery-pagination">
                <button disabled={pagination.current === 1} onClick={() => loadData(pagination.current - 1)}>Prev</button>
                <span>Page {pagination.current} of {pagination.totalPages}</span>
                <button disabled={pagination.current === pagination.totalPages} onClick={() => loadData(pagination.current + 1)}>Next</button>
            </div>
        );
    };

    const readyOrders = orders.filter(o => o.status === 'ready');
    const outForDeliveryOrders = orders.filter(o => o.status === 'out_for_delivery');

    return (
        <div className="delivery-container">
            <header className="delivery-header">
                <h1>Delivery Dashboard</h1>
                <div className="delivery-controls">
                    <div className="support-filter-group">
                        <div className="support-search">
                            <FaSearch className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search orders..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="admin-search-input"
                            />
                        </div>
                        <div className="sort-controls" style={{ display: 'flex', gap: '1rem' }}>
                            <select 
                                className="filter-select"
                                value={`${sortBy}-${sortOrder}`} 
                                onChange={(e) => {
                                    const [field, order] = e.target.value.split('-');
                                    setSortBy(field);
                                    setSortOrder(order as any);
                                }}
                            >
                                <option value="date-asc">Oldest First</option>
                                <option value="date-desc">Newest First</option>
                                <option value="status-asc">Status</option>
                            </select>
                            <select 
                                className="filter-select"
                                value={pagination.limit} 
                                onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), current: 1 }))}
                            >
                                <option value="5">5 Per Page</option>
                                <option value="10">10 Per Page</option>
                                <option value="20">20 Per Page</option>
                                <option value="50">50 Per Page</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="delivery-stats">
                    <div className="stat-pill total">Active: {pagination.total}</div>
                </div>
            </header>

            {loading ? (
                <div className="flex-center p-5"><div className="loader"></div></div>
            ) : (
                <>
                    <div className="delivery-board">
                        <section className="delivery-column">
                            <h2>Ready for Pickup <span className="badge">{readyOrders.length}</span></h2>
                            <div className="orders-list">
                                <AnimatePresence>
                                    {readyOrders.map(order => (
                                        <DeliveryCard 
                                            key={order.id} 
                                            order={order} 
                                            onAction={() => updateOrderStatus(order.id!, 'out_for_delivery').then(() => loadData())}
                                            actionText="Pick Up"
                                            actionIcon={<FaMotorcycle />}
                                            variant="ready"
                                        />
                                    ))}
                                    {readyOrders.length === 0 && <div className="empty-state">No orders ready</div>}
                                </AnimatePresence>
                            </div>
                        </section>

                        <section className="delivery-column">
                            <h2>Out for Delivery <span className="badge">{outForDeliveryOrders.length}</span></h2>
                            <div className="orders-list">
                                <AnimatePresence>
                                    {outForDeliveryOrders.map(order => (
                                        <DeliveryCard 
                                            key={order.id} 
                                            order={order} 
                                            onAction={() => handleDeliveryComplete(order.id!)} 
                                            actionText="Complete Delivery"
                                            actionIcon={<FaCheck />}
                                            variant="out"
                                        />
                                    ))}
                                    {outForDeliveryOrders.length === 0 && <div className="empty-state">No active deliveries</div>}
                                </AnimatePresence>
                            </div>
                        </section>
                    </div>
                    <Pagination />
                </>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

const DeliveryCard = ({ order, onAction, actionText, actionIcon, variant }: { order: Order, onAction: () => void, actionText: string, actionIcon: React.ReactNode, variant: 'ready' | 'out' }) => {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`delivery-card ${variant}`}
        >
            <div className="card-header">
                <span className="order-id">#{order.id}</span>
                <span className="customer-name">{order.customer.name}</span>
            </div>

            <div className="customer-details">
                <div className="detail-row">
                    <FaPhone className="icon" />
                    <a href={`tel:${order.customer.phoneNo}`}>{order.customer.phoneNo}</a>
                </div>
                <div className="detail-row">
                    <FaMapMarkerAlt className="icon" />
                    <span>{order.customer.address}</span>
                </div>
            </div>

            <div className="order-summary">
                {order.items.length} items • ${Number(order.total).toFixed(2)}
            </div>

            <button className={`btn-delivery-action ${variant}`} onClick={onAction}>
                {actionIcon} {actionText}
            </button>
        </motion.div>
    );
};

export default DeliveryDashboard;
