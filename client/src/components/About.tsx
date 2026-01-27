import { motion } from 'framer-motion';

const About = () => {
  return (
    <main className="about-page">
      <section className="container" style={{ padding: '8rem 1rem 4rem', textAlign: 'center' }}>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem', fontSize: '3rem' }}
        >
          Our <span className="text-accent">Story</span>
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ maxWidth: '800px', margin: '0 auto', color: '#a0a0a0', fontSize: '1.2rem', lineHeight: '1.8' }}
        >
          Founded in 2026, CloudResto was born out of a passion for high-quality dining and the convenience of technology. 
          We believe that "fast food" doesn't have to mean "low quality". Our mission is to bring 
          orchestrated culinary masterpieces right to your door, with the speed of light and the warmth of a home-cooked meal.
        </motion.p>
      </section>

      <section className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <motion.div 
            whileHover={{ y: -10 }}
            style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>Fresh Ingredients</h3>
            <p style={{ color: '#aaa' }}>Sourced daily from local organic farms to ensure the highest quality in every bite.</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -10 }}
            style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>Expert Chefs</h3>
            <p style={{ color: '#aaa' }}>Our culinary team brings years of experience from world-class Michelin star restaurants.</p>
          </motion.div>
          <motion.div 
            whileHover={{ y: -10 }}
            style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h3 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>Fast Delivery</h3>
            <p style={{ color: '#aaa' }}>Optimized logistics to ensure your food arrives hot and fresh, every single time.</p>
          </motion.div>
        </div>
      </section>

      <section style={{ background: '#111', padding: '6rem 1rem', textAlign: 'center', marginTop: '4rem' }}>
        <div className="container">
          <h2 style={{ color: '#fff', marginBottom: '2rem' }}>Get In <span className="text-accent">Touch</span></h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>📍 123 Tasty Street, Cloud City, CC 56789</p>
            <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>📞 +1 (555) 123-4567</p>
            <p style={{ color: '#a0a0a0', fontSize: '1.1rem' }}>📧 hello@cloudresto.com</p>
            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: '#d4af37', fontSize: '1.2rem', fontWeight: 'bold' }}>🕒 Open 11:00 AM - 11:00 PM</p>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Every day of the week</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
