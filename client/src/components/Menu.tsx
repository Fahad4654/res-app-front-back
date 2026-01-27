import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchMenu, fetchCategories } from '../services/api';
import type { MenuItem, Category } from '../services/api';
import '../styles/Menu.css';

interface MenuProps {
  onAddToCart: (item: MenuItem) => void;
}

const Menu = ({ onAddToCart }: MenuProps) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('name'); // 'name', 'price'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [menuRes, categoryRes] = await Promise.all([
          fetchMenu(currentPage, 6, activeCategory, searchTerm, sortBy, sortOrder),
          fetchCategories()
        ]);
        setItems(menuRes.data);
        setTotalPages(menuRes.totalPages);
        setCategories(['All', ...categoryRes.data.map((c: Category) => c.name)]);
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentPage, activeCategory, searchTerm, sortBy, sortOrder]);

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm, sortBy, sortOrder]);

  const getFilteredAndSortedItems = () => {
    // Sorting is now handled server-side. 
    // We just return the items as they are from the backend.
    return items;
  };

  if (loading) return <div className="loading">Loading Menu...</div>;

  return (
    <section id="menu" className="menu-section">
      <div className="container">
        <h2 className="section-title">Our <span className="text-accent">Menu</span></h2>
        
        <div className="menu-controls">
          <div className="categories">
            {categories.map(cat => (
              <button 
                key={cat}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => {setActiveCategory(cat); setSearchTerm('')}}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="search-sort-group">
            <input 
              type="text" 
              placeholder="Search dishes..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="menu-search-input"
            />
            <select 
              className="menu-sort-select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
            >
              <option value="name-asc">A to Z</option>
              <option value="name-desc">Z to A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        <div className="grid-menu">
          {getFilteredAndSortedItems().map(item => (
            <motion.div 
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key={item.id} 
              className="menu-card"
            >
              <div className="card-image" style={{ backgroundImage: `url(${item.image})` }}></div>
              <div className="card-content">
                <div className="card-header">
                  <h3>{item.name}</h3>
                  <span className="price">${item.price.toFixed(2)}</span>
                </div>
                <p className="description">{item.description}</p>
                <button className="btn btn-primary add-btn" onClick={() => onAddToCart(item)}>
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination" style={{ marginTop: '3rem' }}>
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(currentPage - 1)}
              className="pagination-btn"
            >
              Prev
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button 
                key={i} 
                className={`pagination-btn ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(currentPage + 1)}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Menu;
