import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    // Create menu_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100),
        image TEXT
      );
    `);

    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        items JSONB NOT NULL,
        customer JSONB NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized');
    
    // Seed data if empty
    const res = await client.query('SELECT COUNT(*) FROM menu_items');
    if (parseInt(res.rows[0].count) === 0) {
      console.log('Seeding menu items...');
      const seedItems = [
        {
            name: "Truffle Mushroom Burger",
            description: "Juicy beef patty topped with truffle mayo, swiss cheese, and sautéed mushrooms on a brioche bun.",
            price: 14.99,
            category: "Burgers",
            image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
        },
        {
            name: "Margherita Pizza",
            description: "Classic tomato sauce, fresh mozzarella, basil, and extra virgin olive oil.",
            price: 12.50,
            category: "Pizza",
            image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
        },
        {
            name: "Caesar Salad",
            description: "Crisp romaine lettuce, parmesan cheese, croutons, and house-made Caesar dressing.",
            price: 10.00,
            category: "Salads",
            image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
        },
        {
            name: "Spicy Chicken Wings",
            description: "Crispy wings tossed in our signature spicy buffalo sauce, served with ranch dip.",
            price: 11.99,
            category: "Appetizers",
            image: "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
        },
        {
            name: "Chocolate Lava Cake",
            description: "Warm chocolate cake with a molten center, served with vanilla bean ice cream.",
            price: 8.50,
            category: "Desserts",
            image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
        },
        {
            name: "Crispy Fries",
            description: "Golden crispy fries seasoned with sea salt.",
            price: 4.50,
            category: "Sides",
            image: "https://images.unsplash.com/photo-1630384060421-a4323ceca041?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"
        }
      ];

      for (const item of seedItems) {
        await client.query(
          'INSERT INTO menu_items (name, description, price, category, image) VALUES ($1, $2, $3, $4, $5)',
          [item.name, item.description, item.price, item.category, item.image]
        );
      }
      console.log('Seeding complete');
    }

  } catch (err: any) {
    console.error('Warning: Database initialization failed (Permissions or Connection).');
    console.error('Error detail:', err.message);
    console.warn('Backend will attempt to run, but API calls may fail if tables do not exist.');
  } finally {
    if (client) client.release();
  }
};

export const query = (text: string, params?: any[]) => pool.query(text, params);
