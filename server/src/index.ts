import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import authRoutes from './routes/auth.js';
import { authenticateToken, requireAdmin, AuthRequest } from './middleware/auth.js';
import { checkPermission, clearPermissionCache } from './middleware/permissions.js';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendOrderConfirmation, sendAdminNotification, sendOrderStatusUpdate } from './services/emailService.js';
import PDFDocument from 'pdfkit';

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

// ===== PERMISSIONS API =====

// Get all permissions (Admin only)
app.get('/api/permissions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [
                { role: 'asc' },
                { resource: 'asc' },
                { action: 'asc' }
            ]
        });
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

// Get permissions for a specific role
app.get('/api/permissions/:role', authenticateToken, async (req: Request, res: Response) => {
    const { role } = req.params;
    
    try {
        const permissions = await prisma.permission.findMany({
            where: { role: role as any },
            orderBy: [
                { resource: 'asc' },
                { action: 'asc' }
            ]
        });
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
});

// Update permissions (Admin only)
app.put('/api/permissions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    const { permissions } = req.body; // Array of { role, resource, action, allowed }

    if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: 'Permissions must be an array' });
    }

    try {
        // Update permissions in a transaction
        await prisma.$transaction(
            permissions.map(p =>
                prisma.permission.upsert({
                    where: {
                        role_resource_action: {
                            role: p.role,
                            resource: p.resource,
                            action: p.action
                        }
                    },
                    update: { allowed: p.allowed },
                    create: {
                        role: p.role,
                        resource: p.resource,
                        action: p.action,
                        allowed: p.allowed
                    }
                })
            )
        );

        // Clear permission cache after update
        clearPermissionCache();

        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

// ===== ORDERS API =====

// Admin/Staff: Get Order Statistics
app.get('/api/orders/stats', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    try {
        let startDate: Date;
        let endDate: Date;

        if (req.query.startDate && req.query.endDate) {
            startDate = new Date(req.query.startDate as string);
            endDate = new Date(req.query.endDate as string);
        } else {
            // Default to today
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
        }

        const stats = await prisma.order.groupBy({
            by: ['status'],
            where: {
                date: {
                    gte: startDate.toISOString(),
                    lt: endDate.toISOString()
                }
            },
            _count: {
                id: true
            }
        });

        const formattedStats = {
            pending: 0,
            preparing: 0,
            ready: 0,
            out_for_delivery: 0,
            delivered: 0,
            cancelled: 0
        };

        stats.forEach(stat => {
            const statusKey = stat.status.toLowerCase().replace(/\s/g, '_') as keyof typeof formattedStats;
            if (formattedStats.hasOwnProperty(statusKey)) {
                formattedStats[statusKey] = stat._count.id;
            }
        });

        res.json(formattedStats);
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ error: 'Failed to fetch order statistics' });
    }
});

// Admin/Staff: Get All Orders with Pagination
app.get('/api/orders', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'date';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.search) {
        const search = req.query.search as string;
        const searchId = parseInt(search);
        const searchPattern = `%${search}%`;

        // Find IDs matching customer fields using raw SQL for case-insensitive JSON search
        const matchingOrders = await prisma.$queryRaw<{ id: number }[]>`
            SELECT id FROM "orders"
            WHERE 
                customer->>'name' ILIKE ${searchPattern}
                OR customer->>'email' ILIKE ${searchPattern}
                OR customer->>'phoneNo' ILIKE ${searchPattern}
        `;

        const matches = matchingOrders.map(o => o.id);
        const whereConditions: any[] = [
            { id: { in: matches } }
        ];

        // Also allow exact ID match if search term is numeric
        if (!isNaN(searchId)) {
            whereConditions.push({ id: searchId });
        }

        where.OR = whereConditions;
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
                take: limit,
                include: {
                    user: { select: { name: true, phoneNo: true } },
                    // customer is a JSON field, so it is returned by default
                    kitchenStaff: { select: { name: true } },
                    deliveryStaff: { select: { name: true } },
                    review: {
                        include: {
                            taggedItems: { select: { id: true } }
                        }
                    }
                }
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

// Admin: Generate Order Invoice (PDF)
app.get('/api/orders/:id/invoice', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(id as string) },
            include: { user: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const doc = new PDFDocument({ 
            size: [396, 612], // Memo/Statement size (5.5 x 8.5 inches)
            margin: 30 
        });
        const filename = `Invoice_${order.id}.pdf`;
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        doc.pipe(res);

        // Header - Center aligned
        doc.fontSize(18).fillColor('#d4af37').text('CloudResto', { align: 'center' });
        doc.fontSize(8).fillColor('#666666').text('Premium Culinary Experience', { align: 'center' });
        doc.moveDown(0.5);
        doc.strokeColor('#333333').lineWidth(0.5).moveTo(30, doc.y).lineTo(366, doc.y).stroke();
        doc.moveDown(0.8);

        // Invoice/Order Info - Side by Side layout
        const topY = doc.y;
        doc.fontSize(9).fillColor('#d4af37').text('BILL TO:', 30, topY, { underline: true });
        
        const customer = order.customer as any;
        doc.fontSize(9).fillColor('#1a1a1a').text(customer.name || 'Guest Customer', 30, doc.y + 2);
        doc.fontSize(7).fillColor('#444444').text(customer.email || '', 30, doc.y);
        if (customer.phoneNo) doc.text(`Phone: ${customer.phoneNo}`, 30, doc.y);
        if (customer.address) doc.text(`Address: ${customer.address}`, 30, doc.y, { width: 180 });

        doc.fontSize(11).fillColor('#1a1a1a').text('INVOICE', 250, topY, { align: 'right', width: 116 });
        doc.fontSize(7).fillColor('#555555').text(`Order ID: #${order.id}`, 250, doc.y, { align: 'right', width: 116 });
        doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 250, doc.y, { align: 'right', width: 116 });
        doc.text(`Status: ${order.status.toUpperCase()}`, 250, doc.y, { align: 'right', width: 116 });
        doc.moveDown(1);

        // Table Header
        const tableTop = doc.y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#d4af37');
        doc.text('Item', 30, tableTop);
        doc.text('Qty', 210, tableTop, { width: 30, align: 'right' });
        doc.text('Price', 250, tableTop, { width: 50, align: 'right' });
        doc.text('Total', 310, tableTop, { width: 56, align: 'right' });
        
        doc.moveDown(0.2);
        doc.strokeColor('#e0e0e0').lineWidth(0.5).moveTo(30, doc.y).lineTo(366, doc.y).stroke();
        doc.font('Helvetica').fillColor('#1a1a1a');

        // Items - Compact
        let currentY = doc.y + 5;
        const items = order.items as any[];
        
        // Even more aggressive scaling for STATEMENT page
        const itemFontSize = items.length > 15 ? 7 : 8;
        doc.fontSize(itemFontSize);

        items.forEach((item: any) => {
            if (currentY > 520) return; // Prevent items from pushing into the total/footer zone

            const startY = currentY;
            doc.text(item.name, 30, currentY, { width: 170 });
            doc.text(item.quantity.toString(), 210, currentY, { width: 30, align: 'right' });
            doc.text(`$${Number(item.price).toFixed(2)}`, 250, currentY, { width: 50, align: 'right' });
            const itemTotal = (Number(item.price) * (item.quantity || 1)).toFixed(2);
            doc.text(`$${itemTotal}`, 310, currentY, { width: 56, align: 'right' });
            
            currentY = Math.max(doc.y, startY + (itemFontSize + 1.5));
        });

        doc.moveDown(0.2);
        doc.strokeColor('#e0e0e0').moveTo(30, currentY).lineTo(366, currentY).stroke();
        currentY += 6;

        // Totals
        const deliveryCharge = parseFloat(req.query.deliveryCharge as string) || 0;
        const grandTotal = Number(order.total) + deliveryCharge;

        if (deliveryCharge > 0) {
            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text('Delivery Charge:', 210, currentY, { width: 90, align: 'right' });
            doc.text(`$${deliveryCharge.toFixed(2)}`, 310, currentY, { width: 56, align: 'right' });
            currentY += 12;
        }

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#d4af37');
        doc.text('Total Amount:', 210, currentY, { width: 90, align: 'right' });
        doc.text(`$${grandTotal.toFixed(2)}`, 310, currentY, { width: 56, align: 'right' });

        // Footer - Scaled for STATEMENT page
        doc.fontSize(7).font('Helvetica-Oblique').fillColor('#888888')
           .text('CloudResto - Thank you for your business!', 30, 570, { align: 'center', width: 336 });

        doc.end();
    } catch (error) {
        console.error('Invoice generation error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate invoice' });
        }
    }
});

// Update Order Status (Restricted by Role)
app.put('/api/orders/:id/status', authenticateToken, checkPermission('orders', 'update'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, estimatedTime } = req.body; // estimatedTime in minutes
    const userRole = (req as AuthRequest).user?.role;

    // Role-based status validation
    if (userRole === Role.KITCHEN_STAFF) {
        if (!['preparing', 'ready'].includes(status)) {
            return res.status(403).json({ error: 'Kitchen staff can only set status to preparing or ready' });
        }
    } else if (userRole === Role.DELIVERY_STAFF) {
        if (!['out_for_delivery', 'delivered'].includes(status)) {
            return res.status(403).json({ error: 'Delivery staff can only set status to out_for_delivery or delivered' });
        }
    } else if (userRole === Role.CUSTOMER_SUPPORT) {
        if (status !== 'cancelled') {
            return res.status(403).json({ error: 'Customer support can only cancel orders' });
        }
    }

    if (typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid order ID' });
    }

    try {
        const updateData: any = { status };
        
        // Check ownership before update
        const existingOrder = await prisma.order.findUnique({ where: { id: parseInt(id) } });
        if (!existingOrder) return res.status(404).json({ error: 'Order not found' });

        if (userRole === Role.KITCHEN_STAFF && existingOrder.kitchenStaffId && existingOrder.kitchenStaffId !== (req as AuthRequest).user?.userId) {
             return res.status(403).json({ error: 'This order is being handled by another staff member' });
        }
        if (userRole === Role.DELIVERY_STAFF && existingOrder.deliveryStaffId && existingOrder.deliveryStaffId !== (req as AuthRequest).user?.userId) {
             return res.status(403).json({ error: 'This order is being handled by another staff member' });
        }

        if (status === 'preparing' && estimatedTime) {
            const readyAt = new Date();
            readyAt.setMinutes(readyAt.getMinutes() + parseInt(estimatedTime));
            updateData.estimatedReadyAt = readyAt;
        }

        // Auto-assign staff
        const userId = (req as AuthRequest).user?.userId;
        if (status === 'preparing') {
            updateData.kitchenStaffId = userId;
        } else if (status === 'out_for_delivery') {
            updateData.deliveryStaffId = userId;
        }

        const order = await prisma.order.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: { // Include for email service usage if needed, though usually just flat fields
                 kitchenStaff: true,
                 deliveryStaff: true
            }
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


// Kitchen Staff: Get Active Orders
app.get('/api/orders/kitchen', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    try {
        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { status: 'pending' },
                    { 
                        status: 'preparing',
                        kitchenStaffId: (req as AuthRequest).user?.userId 
                    }
                ]
            },
            orderBy: { date: 'asc' },
                include: {
                    user: {
                        select: { name: true, phoneNo: true }
                    },
                    kitchenStaff: {
                        select: { name: true }
                    }
                }
        });
        
        const sanitizedOrders = orders.map(order => ({
            ...order,
            total: Number(order.total)
        }));

        res.json(sanitizedOrders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch kitchen orders' });
    }
});

// Delivery Staff: Get Active Orders
app.get('/api/orders/delivery', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    try {
        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { status: 'ready' },
                    { 
                        status: 'out_for_delivery',
                        deliveryStaffId: (req as AuthRequest).user?.userId
                    }
                ]
            },
            orderBy: { date: 'asc' },
                include: {
                    user: {
                        select: { name: true, phoneNo: true, address: true }
                    },
                    deliveryStaff: {
                        select: { name: true }
                    }
                }
        });
        
        const sanitizedOrders = orders.map(order => ({
            ...order,
            total: Number(order.total)
        }));

        res.json(sanitizedOrders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch delivery orders' });
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
            take: limit,
            include: {
                reviews: {
                    where: { isAccepted: true },
                    select: { rating: true, comment: true, createdAt: true, user: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        }),
        prisma.menuItem.count({ where })
    ]);
    
    const sanitizedItems = items.map(item => {
        const reviews = (item as any).reviews || [];
        const avgRating = reviews.length > 0 
            ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length 
            : 0;
        return {
            ...item,
            price: Number(item.price),
            avgRating: parseFloat(avgRating.toFixed(1)),
            reviewCount: reviews.length,
            latestReviews: reviews.slice(0, 3)
        };
    });

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
app.post('/api/menu', authenticateToken, checkPermission('menu', 'create'), upload.single('image'), async (req: Request, res: Response) => {
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
app.post('/api/categories', authenticateToken, checkPermission('categories', 'create'), async (req: Request, res: Response) => {
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
app.post('/api/users', authenticateToken, checkPermission('users', 'create'), async (req: Request, res: Response) => {
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
app.get('/api/users', authenticateToken, checkPermission('users', 'view'), async (req: Request, res: Response) => {
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
app.put('/api/users/:id', authenticateToken, checkPermission('users', 'update'), async (req: Request, res: Response) => {
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
app.delete('/api/users/:id', authenticateToken, checkPermission('users', 'delete'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Admin: Update Menu Item
app.put('/api/menu/:id', authenticateToken, checkPermission('menu', 'update'), upload.single('image'), async (req: Request, res: Response) => {
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
app.delete('/api/menu/:id', authenticateToken, checkPermission('menu', 'delete'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        await prisma.menuItem.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Admin: Update Category
app.put('/api/categories/:id', authenticateToken, checkPermission('categories', 'update'), async (req: Request, res: Response) => {
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
app.delete('/api/categories/:id', authenticateToken, checkPermission('categories', 'delete'), async (req: Request, res: Response) => {
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
        date: order.date.toISOString(),
        estimatedReadyAt: order.estimatedReadyAt?.toISOString()
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
                where: { userId, isDeletedByCustomer: false },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
                include: {
                    kitchenStaff: { select: { name: true } },
                    deliveryStaff: { select: { name: true, phoneNo: true } },
                    review: { select: { id: true, rating: true, comment: true } }
                }
            }),
            prisma.order.count({ where: { userId, isDeletedByCustomer: false } })
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

        if (userRole === 'CUSTOMER') {
            await prisma.order.update({
                where: { id: parseInt(id as string) },
                data: { isDeletedByCustomer: true }
            });
            res.json({ message: 'Order removed from your view' });
        } else {
            await prisma.order.delete({
                where: { id: parseInt(id as string) }
            });
            res.json({ message: 'Order permanently deleted' });
        }
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
                date: order.date.toISOString(),
                estimatedReadyAt: order.estimatedReadyAt?.toISOString()
            }).catch(err => console.error('Failed to send auto-status update email:', err));
        }
    } catch (error) {
        console.error('Error in auto-update ready status:', error);
    }
}, 30000); // Check every 30 seconds

// Reviews: Create Review
app.post('/api/reviews', authenticateToken, async (req: Request, res: Response) => {
    const userId = (req as AuthRequest).user?.userId;
    const { orderId, rating, comment } = req.body;

    if (!userId) return res.sendStatus(403);
    if (!orderId || !rating) return res.status(400).json({ error: 'Order ID and rating are required' });

    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId) return res.status(403).json({ error: 'You can only review your own orders' });
        if (order.status.toLowerCase() !== 'delivered') {
            return res.status(400).json({ error: 'You can only review delivered orders' });
        }

        const review = await prisma.review.create({
            data: {
                rating: parseInt(rating),
                comment,
                orderId: parseInt(orderId),
                userId
            }
        });

        res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'You have already reviewed this order' });
        }
        console.error(error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Admin: Get All Reviews
app.get('/api/reviews', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    try {
        const reviews = await prisma.review.findMany({
            include: {
                user: { select: { name: true, email: true } },
                order: { select: { id: true, items: true, total: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Admin: Accept & Tag Review
app.patch('/api/reviews/:id/accept', authenticateToken, checkPermission('orders', 'view'), async (req: Request, res: Response) => {
    const { id } = req.params;
    const { menuItemIds } = req.body; // Array of MenuItem IDs to tag

    try {
        const review = await prisma.review.update({
            where: { id: parseInt(id as string) },
            data: {
                isAccepted: true,
                taggedItems: {
                    set: (menuItemIds || []).map((itemId: number) => ({ id: itemId }))
                }
            }
        });

        res.json({ message: 'Review accepted and tagged successfully', review });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to accept review' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
