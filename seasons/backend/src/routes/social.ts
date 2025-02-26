import express from 'express';
import { z } from 'zod';
import { db, followsTable, activitiesTable } from '../infra/database';
import { eq, desc } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT token (consistent with other routes)
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

// Follow a user
router.post('/follow', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({ followingId: z.string() });
    const { followingId } = schema.parse(req.body);
    const followerId = req.user.userId;

    // Prevent users from following themselves
    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if the follow relationship already exists
    const existingFollow = await db
      .select()
      .from(followsTable)
      .where(eq(followsTable.followerId, followerId))
      .where(eq(followsTable.followingId, followingId))
      .limit(1);

    if (existingFollow.length > 0) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create the follow relationship
    await db.insert(followsTable).values({ 
      followerId, 
      followingId, 
      createdAt: new Date() 
    });

    // Record the follow activity
    await db.insert(activitiesTable).values({
      userId: followerId,
      type: 'follow',
      targetId: followingId,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Follow error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/follow/:followingId', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({ followingId: z.string() });
    const { followingId } = schema.parse(req.params);
    const followerId = req.user.userId;

    // Delete the follow relationship
    await db
      .delete(followsTable)
      .where(eq(followsTable.followerId, followerId))
      .where(eq(followsTable.followingId, followingId));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unfollow error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to unfollow user' });
  }
});

// Get recent activities (global feed)
router.get('/activities', async (req, res) => {
  try {
    const activities = await db
      .select()
      .from(activitiesTable)
      .orderBy(desc(activitiesTable.createdAt))
      .limit(20);

    res.json(activities);
  } catch (error) {
    console.error('Activities feed error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get activities for a specific user
router.get('/activities/user/:userId', async (req, res) => {
  try {
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(req.params);

    const activities = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.userId, userId))
      .orderBy(desc(activitiesTable.createdAt))
      .limit(20);

    res.json(activities);
  } catch (error) {
    console.error('User activities error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

// Get followers of a user
router.get('/followers/:userId', async (req, res) => {
  try {
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(req.params);

    const followers = await db
      .select()
      .from(followsTable)
      .where(eq(followsTable.followingId, userId));

    res.json(followers);
  } catch (error) {
    console.error('Followers query error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get users that a user is following
router.get('/following/:userId', async (req, res) => {
  try {
    const schema = z.object({ userId: z.string() });
    const { userId } = schema.parse(req.params);

    const following = await db
      .select()
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));

    res.json(following);
  } catch (error) {
    console.error('Following query error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch following users' });
  }
});

export default router; 