import { motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { placeOrder } from '../services/api';
import type { MenuItem, Order } from '../services/api';
import { useState } from 'react';
import '../styles/Cart.css';

interface CartProps {
  items: MenuItem[];
  onRemove: (index: number) => void;
  onAdd: (item: MenuItem) => void;
  onClear: () => void;
  onClose: () => void;
}

import { getCurrentUser } from '../services/auth';

// ... (interface)

const Cart = ({ items, onRemove, onAdd, onClear, onClose }: CartProps) => {
  const user = getCurrentUser();
  const [customer, setCustomer] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    phoneNo: user?.phoneNo || '',
    address: user?.address || '' 
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  // Group items by ID to show quantity
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.id]) {
      acc[item.id] = { ...item, quantity: 0 };
    }
    acc[item.id].quantity += 1;
    return acc;
  }, {} as Record<number, MenuItem & { quantity: number }>);

  const cartItems = Object.values(groupedItems);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setStatus('submitting');
    try {
      const order: Order = {
        items: cartItems,
        total,
        customer,
      };
      await placeOrder(order);
      setStatus('success');
      setTimeout(() => {
        onClear();
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (error) {
        console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="cart-overlay">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween' }}
        className="cart-sidebar"
      >
        <div className="cart-header">
          <h2>Your Order</h2>
          <button className="close-btn" onClick={onClose}><FaTimes /></button>
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-cart">Your cart is empty.</div>
        ) : (
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>${item.price.toFixed(2)} x {item.quantity}</p>
                </div>
                <div className="item-actions">
                  <button onClick={() => onRemove(items.findIndex(i => i.id === item.id))} style={{fontWeight: 'bold', fontSize: '1.2rem'}}>&minus;</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => onAdd(item)} style={{fontWeight: 'bold', fontSize: '1.2rem'}}>&#43;</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="total">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            {status === 'success' ? (
              <div className="success-msg">Order Placed Successfully!</div>
            ) : (
              <form onSubmit={handleSubmit} className="checkout-form">
                <input 
                  type="text" 
                  placeholder="Name" 
                  required 
                  value={customer.name}
                  onChange={e => setCustomer({...customer, name: e.target.value})}
                />
                <input 
                  type="email" 
                  placeholder="Email" 
                  required 
                  value={customer.email}
                  onChange={e => setCustomer({...customer, email: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  required 
                  value={customer.phoneNo}
                  onChange={e => setCustomer({...customer, phoneNo: e.target.value})}
                />
                <textarea 
                  placeholder="Delivery Address" 
                  required 
                  value={customer.address}
                  onChange={e => setCustomer({...customer, address: e.target.value})}
                ></textarea>
                <button type="submit" className="btn btn-primary checkout-btn" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Placing Order...' : 'Place Order'}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Cart;
