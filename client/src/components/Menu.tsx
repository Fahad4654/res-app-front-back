import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchMenu, fetchCategories } from '../services/api';
import type { MenuItem, Category } from '../services/api';
import { FaStar, FaStarHalfAlt, FaRegStar, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../styles/Menu.css';

interface MenuProps {
  onAddToCart: (item: MenuItem) => void;
}

const Menu = ({ onAddToCart }: MenuProps) => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  
  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('name'); // 'name', 'price'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [menuRes, categoryRes] = await Promise.all([
          fetchMenu(currentPage, limit, activeCategory, searchTerm, sortBy, sortOrder),
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
  }, [currentPage, limit, activeCategory, searchTerm, sortBy, sortOrder]);

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm, sortBy, sortOrder, limit]);

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
            <div className="select-group">
              <span className="small text-muted" style={{ fontSize: '0.7rem' }}>Show:</span>
              <select 
                className="menu-sort-select"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                style={{ minWidth: '70px' }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
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
              className={`menu-card ${expandedItem === item.id ? 'expanded' : ''}`}
              onClick={() => {
                if (item.latestReviews && item.latestReviews.length > 0) {
                  setExpandedItem(expandedItem === item.id ? null : item.id!);
                }
              }}
              style={{ cursor: (item.latestReviews?.length ?? 0) > 0 ? 'pointer' : 'default' }}
            >
              <div className="card-image" style={{ backgroundImage: `url(${item.image})` }}></div>
              <div className="card-content">
                <div className="card-header">
                  <h3>{item.name}</h3>
                  <span className="price">${item.price.toFixed(2)}</span>
                </div>
                
                {item.avgRating !== undefined && item.reviewCount! > 0 && (
                  <div className="rating-display">
                    <div className="stars">
                      {[...Array(5)].map((_, i) => {
                        const rating = item.avgRating || 0;
                        if (i < Math.floor(rating)) return <FaStar key={i} />;
                        if (i < rating) return <FaStarHalfAlt key={i} />;
                        return <FaRegStar key={i} />;
                      })}
                    </div>
                    <span className="rating-count">({item.reviewCount})</span>
                  </div>
                )}

                <p className="description">
                  {item.description}
                </p>

                {item.latestReviews && item.latestReviews.length > 0 && (
                  <div className="item-reviews-peek">
                    <div className="reviews-toggle">
                      {expandedItem === item.id ? <><FaChevronUp /> Hide Reviews</> : <><FaChevronDown /> View Reviews</>}
                    </div>
                    
                    {expandedItem === item.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="reviews-list"
                      >
                        {item.latestReviews.map((rev: any, idx: number) => (
                          <div key={idx} className="review-item">
                            <div className="review-header">
                              <span className="review-user">{rev.user?.name || 'Customer'}</span>
                              <div className="review-stars">
                                {[...Array(5)].map((_, i) => (
                                  <FaStar key={i} style={{ fontSize: '0.65rem', color: i < rev.rating ? '#ffc107' : '#444' }} />
                                ))}
                              </div>
                            </div>
                            <p className="review-comment">"{rev.comment}"</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}

                <button 
                  className="btn btn-primary add-btn" 
                  onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
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
