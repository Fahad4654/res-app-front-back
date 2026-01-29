import { useState, useEffect } from 'react';
import { getToken } from '../services/auth';
import { fetchOrders, cancelOrder } from '../services/api';
import type { Order } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaBan, FaSearch } from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import '../styles/Support.css';

const SupportDashboard = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, [searchTerm]);

    const loadData = async () => {
        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            // Using existing fetchOrders which supports search (searches inside customer JSON)
            const response = await fetchOrders(1, 50, searchTerm);
            setOrders(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load orders');
            setLoading(false);
        }
    };

    const handleCancelOrder = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order? This action handles the refund process automatically.',
            onConfirm: async () => {
                try {
                    await cancelOrder(id);
                    toast.success('Order cancelled successfully');
                    loadData();
                } catch (error: any) {
                    toast.error(error.message || 'Failed to cancel order');
                }
            }
        });
    };

    return (
        <div className="support-container">
            <header className="support-header">
                <h1>Customer Support Portal</h1>
                <div className="support-search">
                    <FaSearch className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Search by customer name or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex-center p-5"><div className="loader"></div></div>
            ) : (
                <div className="support-table-wrapper">
                    <table className="support-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Contact</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td className="fw-bold">#{order.id}</td>
                                    <td>
                                        <div className="customer-info">
                                            <FaUser /> {order.customer.name}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="customer-info">
                                            <FaEnvelope /> {order.customer.email}
                                        </div>
                                    </td>
                                    <td>{order.items.length} items</td>
                                    <td>${Number(order.total).toFixed(2)}</td>
                                    <td>
                                        <span className={`status-badge status-${order.status?.toLowerCase().replace(/\s/g, '-')}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                            <button 
                                                className="btn-cancel"
                                                onClick={() => handleCancelOrder(order.id!)}
                                                title="Cancel Order"
                                            >
                                                <FaBan /> Cancel
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-5">No orders found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

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

export default SupportDashboard;
