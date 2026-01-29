import { useState, useEffect } from 'react';
import { getToken } from '../services/auth';
import { updateOrderStatus } from '../services/api';
import type { Order } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import InputModal from './InputModal';
import '../styles/Kitchen.css';

const KitchenDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [inputModal, setInputModal] = useState<{ isOpen: boolean; title: string; message: string; defaultValue: string; onSubmit: (value: string) => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        defaultValue: '',
        onSubmit: () => {} 
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchKitchenOrders();
        const interval = setInterval(fetchKitchenOrders, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchKitchenOrders = async () => {
        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch('http://localhost:5000/api/orders/kitchen', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch orders');
            
            const data = await response.json();
            setOrders(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching kitchen orders:', error);
            toast.error('Failed to update orders');
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        if (status === 'preparing') {
            setInputModal({
                isOpen: true,
                title: 'Set Preparation Time',
                message: 'Enter estimated preparation time in minutes:',
                defaultValue: '15',
                onSubmit: async (time: string) => {
                    const estimatedTime = parseInt(time);
                    if (isNaN(estimatedTime)) {
                        toast.error('Please enter a valid number');
                        return;
                    }
                    performUpdate(id, status, estimatedTime);
                }
            });
        } else {
            performUpdate(id, status);
        }
    };

    const performUpdate = async (id: number, status: string, estimatedTime?: number) => {
        try {
            await updateOrderStatus(id, status, estimatedTime);
            toast.success(`Order marked as ${status}`);
            fetchKitchenOrders();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        }
    };

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const preparingOrders = orders.filter(o => o.status === 'preparing');

    return (
        <div className="kitchen-container">
            <header className="kitchen-header">
                <h1>Kitchen Display System</h1>
                <div className="kitchen-stats">
                    <div className="stat-pill pending">Pending: {pendingOrders.length}</div>
                    <div className="stat-pill preparing">Preparing: {preparingOrders.length}</div>
                </div>
            </header>

            {loading ? (
                <div className="flex-center p-5"><div className="loader"></div></div>
            ) : (
                <div className="kitchen-board">
                    <section className="kitchen-column">
                        <h2>New Orders <span className="badge">{pendingOrders.length}</span></h2>
                        <div className="orders-list">
                            <AnimatePresence>
                                {pendingOrders.map(order => (
                                    <OrderCard key={order.id} order={order} onAction={() => handleStatusUpdate(order.id!, 'preparing')} actionText="Start Preparing" />
                                ))}
                                {pendingOrders.length === 0 && <div className="empty-state">No pending orders</div>}
                            </AnimatePresence>
                        </div>
                    </section>

                    <section className="kitchen-column">
                        <h2>Preparing <span className="badge">{preparingOrders.length}</span></h2>
                        <div className="orders-list">
                            <AnimatePresence>
                                {preparingOrders.map(order => (
                                    <OrderCard key={order.id} order={order} onAction={() => handleStatusUpdate(order.id!, 'ready')} actionText="Mark Ready" isPreparing />
                                ))}
                                {preparingOrders.length === 0 && <div className="empty-state">Nothing performing</div>}
                            </AnimatePresence>
                        </div>
                    </section>
                </div>
            )}

            <InputModal
                isOpen={inputModal.isOpen}
                title={inputModal.title}
                message={inputModal.message}
                defaultValue={inputModal.defaultValue}
                onSubmit={(val) => {
                    inputModal.onSubmit(val);
                    setInputModal(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setInputModal(prev => ({ ...prev, isOpen: false }))}
                inputType="number"
            />
        </div>
    );
};

const OrderCard = ({ order, onAction, actionText, isPreparing }: { order: Order, onAction: () => void, actionText: string, isPreparing?: boolean }) => {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`kitchen-card ${isPreparing ? 'preparing-card' : ''}`}
        >
            <div className="card-header">
                <span className="order-id">#{order.id}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="order-time">{new Date(order.date || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {order.kitchenStaff && <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Prep: {order.kitchenStaff.name}</span>}
                </div>
            </div>
            
            <div className="card-items">
                {order.items.map((item, idx) => (
                    <div key={idx} className="order-item">
                        <span className="qty">{item.quantity || 1}x</span>
                        <span className="name">{item.name}</span>
                    </div>
                ))}
            </div>

            {isPreparing && order.estimatedReadyAt && (
                <div className="timer-display">
                    Due: {new Date(order.estimatedReadyAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            )}

            <button className="btn-kitchen-action" onClick={onAction}>
                {actionText}
            </button>
        </motion.div>
    );
};

export default KitchenDashboard;
