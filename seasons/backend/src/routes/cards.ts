import express from 'express';
import { z } from 'zod';
import { db, cardsTable, activitiesTable, seasonsTable } from '../infra/database';
import { enqueuePayment } from '../infra/redis';
import { calculateSecondarySale } from '../core/payment';
import { eq } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';

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

// Sell a card (secondary market)
router.post('/sell', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      leaf: z.string(),
      sellerPrice: z.number().positive(),
      buyerPubkey: z.string(),
    });
    
    const { leaf, sellerPrice, buyerPubkey } = schema.parse(req.body);
    const sellerPubkey = req.user.userId;

    // Verify ownership and validity
    const cards = await db.select().from(cardsTable).where(eq(cardsTable.leaf, leaf)).limit(1);
    
    if (cards.length === 0 || cards[0].ownerId !== sellerPubkey) {
      return res.status(403).json({ error: 'Card not owned by seller' });
    }
    
    const card = cards[0];
    
    if (!card.purchasePrice) {
      return res.status(400).json({ error: 'Purchase price not set' });
    }

    // Check if price is within allowed range
    const maxSellerPrice = parseFloat(card.purchasePrice) * 2;
    if (sellerPrice > maxSellerPrice) {
      return res.status(400).json({ 
        error: `Seller price exceeds maximum allowed: ${maxSellerPrice} TIX` 
      });
    }

    // Calculate price distribution
    const { totalPrice, seller, fees } = calculateSecondarySale(sellerPrice);
    
    const seasons = await db.select()
      .from(seasonsTable)
      .where(eq(seasonsTable.id, card.seasonId))
      .limit(1);
      
    if (seasons.length === 0) {
      return res.status(404).json({ error: 'Season not found' });
    }
    
    const season = seasons[0];

    // This would be implemented in src/infra/solana.ts
    // await transferTIX(buyerPubkey, sellerPubkey, seller);
    // await transferTIX(buyerPubkey, season.userId, fees.uploader);
    // await transferTIX(buyerPubkey, process.env.TREASURY_TOKEN_ACCOUNT!, fees.platform + fees.community);

    // Update card ownership
    await db.update(cardsTable)
      .set({ 
        ownerId: buyerPubkey, 
        purchasePrice: totalPrice.toString(), 
        forSale: false 
      })
      .where(eq(cardsTable.leaf, leaf));
    
    // Queue payments
    await enqueuePayment(card.seasonId, fees.community, 'community');
    await enqueuePayment(card.seasonId, fees.platform, 'platform');

    // Record activity
    await db.insert(activitiesTable).values({
      userId: buyerPubkey,
      type: 'sale',
      targetId: leaf,
      createdAt: new Date(),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Sell card error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to sell card' });
  }
});

// List cards on the market
router.get('/market', async (req, res) => {
  try {
    const cards = await db.select().from(cardsTable).where(eq(cardsTable.forSale, true));
    res.json(cards);
  } catch (error) {
    console.error('Market query error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

// Set card for sale
router.post('/list', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      leaf: z.string(),
      price: z.number().positive(),
    });
    
    const { leaf, price } = schema.parse(req.body);
    const ownerPubkey = req.user.userId;

    // Verify ownership
    const cards = await db.select().from(cardsTable).where(eq(cardsTable.leaf, leaf)).limit(1);
    
    if (cards.length === 0 || cards[0].ownerId !== ownerPubkey) {
      return res.status(403).json({ error: 'Card not owned by seller' });
    }
    
    // Set card for sale
    await db.update(cardsTable)
      .set({ 
        forSale: true,
        purchasePrice: price.toString()
      })
      .where(eq(cardsTable.leaf, leaf));

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('List card error:', error);
    Sentry.captureException(error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to list card' });
  }
});

export default router; 