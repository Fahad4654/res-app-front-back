import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShoppingCart, FaBars, FaTimes, FaUser } from 'react-icons/fa';
import { getCurrentUser, logout } from '../services/auth';
import type { User } from '../services/auth';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
}

const Navbar = ({ cartCount, onCartClick }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50 || location.pathname !== '/');
    };
    window.addEventListener('scroll', handleScroll);
    setUser(getCurrentUser());
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-content">
        <Link to="/" className="logo">CloudResto.</Link>
        
        <div className="desktop-links">
          <Link to="/">Home</Link>
          <Link to="/menu">Menu</Link>
          <Link to="/about">About</Link>
        </div>

        <div className="nav-actions">
          {user ? (
            <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="user-welcome">Hi, {user.name}</span>
              <Link to="/profile" className="nav-link">Profile</Link>
              {user.role === 'ADMIN' && <Link to="/admin" className="nav-link">Dashboard</Link>}
              {user.role === 'KITCHEN_STAFF' && <Link to="/kitchen" className="nav-link">Kitchen</Link>}
              {user.role === 'DELIVERY_STAFF' && <Link to="/delivery" className="nav-link">Delivery</Link>}
              {user.role === 'CUSTOMER_SUPPORT' && <Link to="/support" className="nav-link">Support</Link>}
              <Link to="/my-orders" className="nav-link">My Orders</Link>
              <button onClick={handleLogout} className="btn-small" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '4px', color: '#fff', background: 'transparent', cursor: 'pointer' }}>Logout</button>
            </div>
          ) : (
            <Link to="/login" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <FaUser /> Login
            </Link>
          )}

          <button className="cart-btn" onClick={onCartClick}>
            <FaShoppingCart />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/menu" onClick={() => setMobileMenuOpen(false)}>Menu</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                {user.role === 'ADMIN' && <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>}
                {user.role === 'KITCHEN_STAFF' && <Link to="/kitchen" onClick={() => setMobileMenuOpen(false)}>Kitchen</Link>}
                {user.role === 'DELIVERY_STAFF' && <Link to="/delivery" onClick={() => setMobileMenuOpen(false)}>Delivery</Link>}
                {user.role === 'CUSTOMER_SUPPORT' && <Link to="/support" onClick={() => setMobileMenuOpen(false)}>Support</Link>}
                <Link to="/my-orders" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }} 
                  className="mobile-menu-logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
