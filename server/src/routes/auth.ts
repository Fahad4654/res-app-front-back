import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_super_secret_key_456';

const generateAccessToken = (user: any) => {
    return jwt.sign(
        { userId: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '15m' }
    );
};

const generateRefreshToken = async (user: any) => {
    const token = jwt.sign(
        { userId: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    await prisma.refreshToken.create({
        data: {
            token,
            userId: user.id
        }
    });

    return token;
};

// Register
router.post('/register', async (req, res) => {
    const { name, email, password, phoneNo, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phoneNo: phoneNo || '',
                role: role || 'CUSTOMER'
            }
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);

        res.status(201).json({ 
            message: 'User created successfully', 
            token: accessToken,
            refreshToken,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                phoneNo: user.phoneNo,
                address: user.address,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt
            } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);

        res.json({ 
            token: accessToken, 
            refreshToken,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                phoneNo: user.phoneNo,
                address: user.address,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt
            } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });

        if (!storedToken) {
            return res.status(403).json({ error: 'Invalid refresh token' });
        }

        jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err: any, decoded: any) => {
            if (err) {
                // Token expired or invalid, delete from DB
                await prisma.refreshToken.delete({ where: { token: refreshToken } });
                return res.status(403).json({ error: 'Invalid refresh token' });
            }

            const accessToken = generateAccessToken(storedToken.user);
            res.json({ token: accessToken });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
        try {
            await prisma.refreshToken.delete({ where: { token: refreshToken } });
        } catch (e) {
            // Token might not exist, ignore
        }
    }
    res.json({ message: 'Logged out successfully' });
});

export default router;
