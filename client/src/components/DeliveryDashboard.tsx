import { useState, useEffect } from 'react';
import { getToken } from '../services/auth';
import { updateOrderStatus } from '../services/api';
import type { Order } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { FaPhone, FaMapMarkerAlt, FaCheck, FaMotorcycle } from 'react-icons/fa';
import '../styles/Delivery.css';

const DeliveryDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDeliveryOrders();
        const interval = setInterval(fetchDeliveryOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDeliveryOrders = async () => {
        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch('http://localhost:5000/api/orders/delivery', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch orders');
            
            const data = await response.json();
            setOrders(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching delivery orders:', error);
            toast.error('Failed to update orders');
            setLoading(false);
        }
    };

    const handleDeliveryComplete = async (id: number) => {
        try {
            if (!window.confirm('Confirm delivery complete?')) return;
            
            await updateOrderStatus(id, 'delivered');
            toast.success('Order delivered!');
            setOrders(orders.filter(o => o.id !== id)); // Optimistic remove
            fetchDeliveryOrders();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update status');
        }
    };

    const readyOrders = orders.filter(o => o.status === 'ready');
    const outForDeliveryOrders = orders.filter(o => o.status === 'out_for_delivery');

    return (
        <div className="delivery-container">
            <header className="delivery-header">
                <h1>Delivery Dashboard</h1>
                <div className="delivery-stats">
                    <div className="stat-pill ready">Ready: {readyOrders.length}</div>
                    <div className="stat-pill out">On Route: {outForDeliveryOrders.length}</div>
                </div>
            </header>

            {loading ? (
                <div className="flex-center p-5"><div className="loader"></div></div>
            ) : (
                <div className="delivery-board">
                    <section className="delivery-column">
                        <h2>Ready for Pickup <span className="badge">{readyOrders.length}</span></h2>
                        <div className="orders-list">
                            <AnimatePresence>
                                {readyOrders.map(order => (
                                    <DeliveryCard 
                                        key={order.id} 
                                        order={order} 
                                        onAction={() => updateOrderStatus(order.id!, 'out_for_delivery').then(fetchDeliveryOrders)}
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
            )}
        </div>
    );
};

const DeliveryCard = ({ order, onAction, actionText, actionIcon, variant }: any) => {
    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className={`delivery-card ${variant}`}
        >
            <div className="card-header">
                <span className="order-id">#{order.id}</span>
                <div style={{ textAlign: 'right' }}>
                    <span className="customer-name">{order.customer.name}</span>
                    {order.deliveryStaff && <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>Driver: {order.deliveryStaff.name}</div>}
                </div>
            </div>
            
            <div className="customer-details">
                <div className="detail-row">
                    <FaPhone className="icon" />
                    <a href={`tel:${order.customer.phoneNo}`}>{order.customer.phoneNo || 'No phone'}</a>
                </div>
                <div className="detail-row">
                    <FaMapMarkerAlt className="icon" />
                    <span>{order.customer.address || 'No address provided'}</span>
                </div>
            </div>

            <div className="order-summary">
                {order.items.length} items • ${order.total}
            </div>

            <button className={`btn-delivery-action ${variant}`} onClick={onAction}>
                {actionIcon} {actionText}
            </button>
        </motion.div>
    );
};

export default DeliveryDashboard;
