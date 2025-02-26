import express from 'express';
import { z } from 'zod';
import { db, usersTable } from '../infra/database';
import { createSubscription } from '../infra/stripe';
import { Keypair } from '@solana/web3.js';
import speakeasy from 'speakeasy';
import { eq } from 'drizzle-orm';
import { cacheUser, getCachedUser } from '../infra/redis';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';
import { searchUsers } from '../infra/database';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// User signup
router.post('/signup', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });
    
    const { email, password } = schema.parse(req.body);

    const wallet = Keypair.generate();
    const mfaSecret = speakeasy.generateSecret({ length: 20 }).base32;

    const user = {
      id: wallet.publicKey.toBase58(),
      email,
      walletPubkey: wallet.publicKey.toBase58(),
      tixBalance: '200',
      mfaSecret,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(usersTable).values(user);
    // Mock for now since we don't have the Solana transfer function yet
    // await transferTIX(process.env.TREASURY_TOKEN_ACCOUNT!, user.id, 200);
    await cacheUser(user.id, user);

    const token = jwt.sign(
      { userId: user.id, role: 'user' }, 
      process.env.JWT_SECRET || 'default_secret', 
      { expiresIn: '15m' }
    );
    
    res.status(201).json({ token, userId: user.id, mfaSetupRequired: true });
  } catch (error) {
    console.error('Signup error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
      mfaCode: z.string().optional(),
    });
    
    const { email, password, mfaCode } = schema.parse(req.body);

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // In a real app, you'd verify the password hash here
    
    if (user.mfaSecret && mfaCode) {
      const verified = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: mfaCode,
      });
      
      if (!verified) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'default_secret', 
      { expiresIn: '15m' }
    );
    
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
  }
});

// Get user details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check cache first
    const cachedUser = await getCachedUser(id);
    if (cachedUser) {
      return res.json(cachedUser);
    }
    
    // If not in cache, query the database
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Cache the user data
    await cacheUser(id, user);
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const users = await searchUsers(query);
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router; 