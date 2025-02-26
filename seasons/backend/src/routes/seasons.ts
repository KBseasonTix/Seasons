import express from 'express';
import { z } from 'zod';
import { createSeason } from '../routes/seasons';
import { db, seasonsTable, cardsTable, activitiesTable } from '../infra/database';
import { eq } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT token (same as in users.ts)
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

// Create a season
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      uris: z.array(z.string().url()).length(10),
    });
    
    const { uris } = schema.parse(req.body);
    const userId = req.user.userId;

    // This function should be implemented in src/core/season.ts
    const { seasons, cards } = createSeason({ uris, userId });

    // This should be implemented in src/infra/solana.ts
    for (const season of seasons) {
      // const mintAddress = await mintSeason(season);
      // season.id = mintAddress;
    }

    await db.insert(seasonsTable).values(seasons);
    await db.insert(cardsTable).values(cards);

    for (const season of seasons) {
      await db.insert(activitiesTable).values({
        userId,
        type: 'upload',
        targetId: season.id,
        createdAt: new Date(),
      });
    }

    res.status(201).json({ seasons, cards });
  } catch (error) {
    console.error('Create season error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create season' });
  }
});

// Get a season by ID
router.get('/:id', async (req, res) => {
  try {
    const schema = z.object({ id: z.string() });
    const { id } = schema.parse(req.params);

    const seasons = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id)).limit(1);
    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }

    res.json(seasons[0]);
  } catch (error) {
    console.error('Get season error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch season' });
  }
});

export default router;