import express from 'express';
import { z } from 'zod';
import { db, cardsTable, activitiesTable, seasonsTable } from '../infra/database';
import { enqueuePayment } from '../infra/redis';
import { calculateInitialDistribution, INITIAL_SALE_PRICE } from '../core/payment';
import { eq } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT token (same as in users.ts and seasons.ts)
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

// Buy a card pack
router.post('/buy', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({ seasonId: z.string() });
    const { seasonId } = schema.parse(req.body);
    const buyerPubkey = req.user.userId;

    const price = INITIAL_SALE_PRICE;
    const { uploader, treasury } = calculateInitialDistribution(price);

    // Find the season
    const seasons = await db.select().from(seasonsTable).where(eq(seasonsTable.id, seasonId)).limit(1);
    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    const season = seasons[0];

    // This would be implemented in src/infra/solana.ts
    // await transferTIX(buyerPubkey, season.userId, uploader);
    // await transferTIX(buyerPubkey, process.env.TREASURY_TOKEN_ACCOUNT!, treasury);

    // Find an available card
    const cards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.seasonId, seasonId))
      .where(eq(cardsTable.ownerId, null))
      .limit(1);

    if (cards.length === 0) {
      return res.status(404).json({ error: 'No cards available' });
    }
    const card = cards[0];

    // Update card ownership
    await db
      .update(cardsTable)
      .set({ 
        ownerId: buyerPubkey, 
        purchasePrice: price.toString() 
      })
      .where(eq(cardsTable.leaf, card.leaf));

    // Add to payment queues
    await enqueuePayment(seasonId, price * 0.1, 'community');
    await enqueuePayment(seasonId, price * 0.025, 'platform');

    // Record activity
    await db.insert(activitiesTable).values({
      userId: buyerPubkey,
      type: 'purchase',
      targetId: card.leaf,
      createdAt: new Date(),
    });

    res.status(200).json(card);
  } catch (error) {
    console.error('Buy card error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to purchase card' });
  }
});

export default router; 