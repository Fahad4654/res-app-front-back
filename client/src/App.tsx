import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import type { MenuItem } from './services/api';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Menu from './components/Menu';
import Cart from './components/Cart';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import DeliveryDashboard from './components/DeliveryDashboard';
import SupportDashboard from './components/SupportDashboard';
import MyOrders from './components/MyOrders';
import Profile from './components/Profile';
import About from './components/About';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.css';

const Home = () => (
  <main>
    <Hero />
    <section className="container" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ marginBottom: '1.5rem', fontSize: '2.5rem' }}
      >
        Welcome to your <span className="text-accent">Culinary Journey</span>
      </motion.h2>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        style={{ maxWidth: '700px', margin: '0 auto 2.5rem', color: '#a0a0a0', fontSize: '1.1rem' }}
      >
        Experience fine dining delivered with speed and care. Explore our curated menu of gourmet dishes, 
        prepared by our expert chefs and delivered fresh to your doorstep.
      </motion.p>
      <Link 
        to="/menu"
        style={{ textDecoration: 'none', display: 'inline-block' }}
      >
        <motion.button 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary"
          style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}
        >
          Explore Our Menu
        </motion.button>
      </Link>
    </section>
  </main>
);

function AppContent() {
  const [cartItems, setCartItems] = useState<MenuItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();

  const addToCart = (item: MenuItem) => {
    setCartItems([...cartItems, item]);
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    const newItems = [...cartItems];
    newItems.splice(index, 1);
    setCartItems(newItems);
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app">
      {!isAuthPage && <Navbar cartCount={cartItems.length} onCartClick={() => setIsCartOpen(true)} />}
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu onAddToCart={addToCart} />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/kitchen" 
          element={
            <ProtectedRoute allowedRoles={['KITCHEN_STAFF', 'ADMIN']}>
              <KitchenDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/delivery" 
          element={
            <ProtectedRoute allowedRoles={['DELIVERY_STAFF', 'ADMIN']}>
              <DeliveryDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/support" 
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER_SUPPORT', 'ADMIN']}>
              <SupportDashboard />
            </ProtectedRoute>
          } 
        />

        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>

      <AnimatePresence>
        {isCartOpen && (
          <Cart 
            items={cartItems} 
            onClose={() => setIsCartOpen(false)} 
            onRemove={removeFromCart}
            onAdd={addToCart}
            onClear={clearCart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#4caf50',
              secondary: '#fff',
            },
            style: {
              border: '1px solid rgba(76, 175, 80, 0.3)',
            },
          },
          error: {
            iconTheme: {
              primary: '#f44336',
              secondary: '#fff',
            },
            style: {
              border: '1px solid rgba(244, 67, 54, 0.3)',
            },
          },
        }}
      />
    </BrowserRouter>
  );
}

export default App;
