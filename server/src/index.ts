import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth.js';
import { authenticateToken, requireAdmin, AuthRequest } from './middleware/auth.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendOrderConfirmation, sendAdminNotification, sendOrderStatusUpdate } from './services/emailService.js';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.use('/api/auth', authRoutes);

// Admin: Get All Orders with Pagination
app.get('/api/orders', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'date';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
            { customer: { path: ['name'], string_contains: search } },
            { customer: { path: ['email'], string_contains: search } }
        ];
    }

    let orderBy: any = { [sortBy]: sortOrder };
    if (sortBy === 'customer') {
        orderBy = { customer: { path: ['name'], sort: sortOrder } };
    }

    try {
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                orderBy,
                skip,
                take: limit
            }),
            prisma.order.count({ where })
        ]);
        
        // Sanitize Decimal for JSON
        const sanitizedOrders = orders.map(order => ({
            ...order,
            total: Number(order.total)
        }));

        res.json({
            data: sanitizedOrders,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Admin: Update Order Status
app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, estimatedTime } = req.body; // estimatedTime in minutes

    if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid order ID' });
    }

    try {
        const updateData: any = { status };
        
        if (status === 'preparing' && estimatedTime) {
            const readyAt = new Date();
            readyAt.setMinutes(readyAt.getMinutes() + parseInt(estimatedTime));
            updateData.estimatedReadyAt = readyAt;
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // Trigger email notification for status update
        sendOrderStatusUpdate({
            ...(order as any),
            total: Number(order.total),
            items: order.items as any[],
            customer: order.customer as any,
            date: order.date.toISOString(),
            estimatedReadyAt: (order as any).estimatedReadyAt?.toISOString()
        }).catch(err => console.error('Failed to send status update email:', err));

        res.json({ message: 'Order updated', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});



// Seed Menu if empty (Simple check)
const seedMenu = async () => {
    const count = await prisma.menuItem.count();
    if (count === 0) {
        console.log('Menu seeded.');
    }

    // Seed Categories from Items
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
        console.log('Seeding categories from menu items...');
        const items = await prisma.menuItem.findMany();
        const categories = [...new Set(items.map(i => i.category || 'General'))];
        
        for (const cat of categories) {
            await prisma.category.upsert({
                where: { name: cat },
                update: {},
                create: { name: cat }
            });
        }
        console.log('Categories seeded.');
    }
};

// Seed Users if empty
const seedUsers = async () => {
    const count = await prisma.user.count();
    if (count === 0) {
        console.log('Seeding users...');
        const password = await bcrypt.hash('123456', 10);
        
        await prisma.user.createMany({
            data: [
                {
                    name: 'Admin User',
                    email: 'admin@example.com',
                    password,
                    role: 'ADMIN'
                },
                {
                    name: 'John Doe',
                    email: 'user@example.com',
                    password,
                    role: 'CUSTOMER'
                }
            ]
        });
        console.log('Users seeded: admin@example.com (123456), user@example.com (123456)');
    }
};

seedMenu().catch(e => console.error('Menu seeding failed', e));
seedUsers().catch(e => console.error('User seeding failed', e));

// Get Menu Items with Pagination
app.get('/api/menu', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const category = req.query.category as string;
  const search = req.query.search as string;
  const sortBy = (req.query.sortBy as string) || 'id';
  const sortOrder = (req.query.sortOrder as string) || 'asc';
  const skip = (page - 1) * limit;

  const where: any = {};
  if (category && category !== 'All') {
    where.category = category;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  try {
    const [items, total] = await Promise.all([
        prisma.menuItem.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take: limit
        }),
        prisma.menuItem.count({ where })
    ]);
    
    const sanitizedItems = items.map(item => ({
        ...item,
        price: Number(item.price)
    }));

    res.json({
        data: sanitizedItems,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Admin: Create Menu Item
app.post('/api/menu', authenticateToken, requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
    const { name, description, price, category, imageUrl } = req.body;
    let imagePath = imageUrl;

    if (req.file) {
        imagePath = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    }

    if (!name || !price) {
        return res.status(400).json({ error: 'Name and Price are required' });
    }

    try {
        const item = await prisma.menuItem.create({
            data: {
                name,
                description,
                price: parseFloat(price),
                category: category || 'General',
                image: imagePath || 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'
            }
        });
        res.status(201).json({ message: 'Item created', item });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create item' });
    }
});

// ... (Menu Create Endpoint)

// Admin: Create Category
app.post('/api/categories', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const category = await prisma.category.create({ data: { name } });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// Get Categories with Pagination
app.get('/api/categories', async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'name';
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
        where.name = { contains: search, mode: 'insensitive' };
    }

    try {
        const [categories, total] = await Promise.all([
            prisma.category.findMany({ 
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit
            }),
            prisma.category.count({ where })
        ]);
        res.json({
            data: categories,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Admin: Create User
app.post('/api/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'CUSTOMER'
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true
            }
        });
        res.status(201).json(newUser);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Admin: Get All Users with Pagination
app.get('/api/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'id';
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phoneNo: { contains: search, mode: 'insensitive' } }
        ];
    }

    try {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    phoneNo: true,
                    address: true,
                    profilePicture: true,
                    createdAt: true
                }
            }),
            prisma.user.count({ where })
        ]);
        res.json({
            data: users,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin: Update User
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { role, name, phoneNo, address } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { 
                role: role as any, 
                name: name as string, 
                phoneNo: phoneNo as string, 
                address: address as string 
            }
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Admin: Delete User
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Admin: Update Menu Item
app.put('/api/menu/:id', authenticateToken, requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, description, price, category, imageUrl } = req.body;
    let image = imageUrl as string;

    if (req.file) {
        image = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    }

    try {
        const updatedItem = await prisma.menuItem.update({
            where: { id: parseInt(id) },
            data: {
                name: name as string,
                description: description as string,
                price: parseFloat(price as string),
                category: category as string,
                image
            }
        });
        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// Admin: Delete Menu Item
app.delete('/api/menu/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.menuItem.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Admin: Update Category
app.put('/api/categories/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name } = req.body;
    try {
        const updatedCategory = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { name: name as string }
        });
        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Admin: Delete Category
app.delete('/api/categories/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.category.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// Place Order
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { items, customer, total } = req.body;
    
    if (!items || !customer || !total) {
      res.status(400).json({ error: 'Missing order details' });
      return; 
    }

    let userId: number | undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            // Very simple decode for now or use jwt.verify inside try/catch
            // Note: In real app, reuse authenticateToken logic or similar
            const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
            const decoded: any = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
        } catch (e) {
            // Ignore invalid token for order placement, treat as guest? 
            // Or maybe warn. I'll treat as guest to not block order.
            console.warn('Invalid token during order placement', e);
        }
    }

    const order = await prisma.order.create({
        data: {
            items,
            customer,
            total,
            status: 'pending',
            userId
        }
    });

    // Trigger email notifications
    const emailOrder = {
        ...order,
        total: Number(order.total),
        items: items as any[],
        customer: customer as any,
        date: order.date.toISOString()
    };
    sendOrderConfirmation(emailOrder).catch(err => console.error('Failed to send confirmation email:', err));
    sendAdminNotification(emailOrder).catch(err => console.error('Failed to send admin notification:', err));

    res.status(201).json({ message: 'Order placed successfully', orderId: order.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// User: Get My Orders with Pagination
app.get('/api/orders/my-orders', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) return res.sendStatus(403);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'date';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const skip = (page - 1) * limit;

    try {
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: { userId },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit
            }),
            prisma.order.count({ where: { userId } })
        ]);
        
        const sanitizedOrders = orders.map(order => ({
            ...order,
            total: Number(order.total)
        }));

        res.json({
            data: sanitizedOrders,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
});

// User: Update Profile
app.put('/api/auth/profile', authenticateToken, upload.single('profilePicture'), async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) return res.sendStatus(403);

    const { name, phoneNo, address } = req.body;
    let profilePicture = req.body.profilePicture;

    if (req.file) {
        profilePicture = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                phoneNo,
                address,
                profilePicture
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                phoneNo: true,
                address: true,
                profilePicture: true
            }
        });
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// User: Cancel Order (Only if pending)
app.put('/api/orders/:id/cancel', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) return res.sendStatus(403);
    const { id } = req.params;

    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(id as string) }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        // Check ownership
        if (order.userId !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own orders' });
        }

        // Check if pending
        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending orders can be cancelled' });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: parseInt(id as string) },
            data: { status: 'cancelled' }
        });

        res.json({ message: 'Order cancelled successfully', order: updatedOrder });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
});

// Admin & User: Delete Order (Only if pending, cancelled, or delivered)
app.delete('/api/orders/:id', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.userId;
    const userRole = (req as AuthRequest).user?.role;
    const { id } = req.params;

    if (!userId) return res.sendStatus(403);

    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(id as string) }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Permission check: Admin can delete any, User can delete only their own
        if (userRole !== 'ADMIN' && order.userId !== userId) {
            return res.status(403).json({ error: 'You are not authorized to delete this order' });
        }

        // Status check: Only pending, cancelled, or delivered
        const allowedStatuses = ['pending', 'cancelled', 'delivered'];
        if (!allowedStatuses.includes(order.status.toLowerCase())) {
            return res.status(400).json({ error: 'This order cannot be deleted in its current status' });
        }

        await prisma.order.delete({
            where: { id: parseInt(id as string) }
        });

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Auto-update 'preparing' orders to 'ready' when time is up
setInterval(async () => {
    try {
        const now = new Date();
        const ordersToUpdate = await prisma.order.findMany({
            where: {
                status: 'preparing',
                estimatedReadyAt: {
                    lte: now
                }
            } as any
        });

        for (const order of ordersToUpdate) {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'ready' }
            });
            console.log(`Order #${order.id} automatically updated to 'ready'`);
            
            // Notify customer via email if needed
            sendOrderStatusUpdate({
                ...order,
                status: 'ready',
                total: Number(order.total),
                items: order.items as any[],
                customer: order.customer as any,
                date: order.date.toISOString()
            }).catch(err => console.error('Failed to send auto-status update email:', err));
        }
    } catch (error) {
        console.error('Error in auto-update ready status:', error);
    }
}, 30000); // Check every 30 seconds

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
