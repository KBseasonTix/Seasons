import express, { Request, Response, NextFunction } from 'express';
import { db, paymentsTable, cardsTable } from '../infra/database';
import { Connection, Transaction, Keypair, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { getPendingPayments, clearProcessedPayments } from '../infra/redis';
import { calculateCommunitySplit } from '../core/payment';
import { eq, desc } from 'drizzle-orm';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const router = express.Router();

// Middleware to verify JWT token with admin check
const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required for this operation' });
    }
    
    req.user = user;
    next();
  });
};

// Process pending payments
router.post('/process', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Get pending payments from Redis queue
    const payments = await getPendingPayments();
    
    if (payments.length === 0) {
      return res.status(200).json({ message: 'No pending payments to process', processed: 0 });
    }
    
    // Initialize Solana connection and wallet
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    // Make sure the private key exists
    if (!process.env.PLATFORM_WALLET_SECRET) {
      throw new Error('Platform wallet secret key not configured');
    }
    
    const wallet = Keypair.fromSecretKey(
      Buffer.from(process.env.PLATFORM_WALLET_SECRET, 'hex')
    );
    
    const tx = new Transaction();
    
    // Record payments in database
    for (const payment of payments) {
      await db.insert(paymentsTable).values({ 
        seasonId: payment.seasonId,
        amount: payment.amount,
        type: payment.type,
        processed: false,
        createdAt: new Date()
      });
      
      // Handle community payment distribution
      if (payment.type === 'community') {
        const holders = await db
          .select()
          .from(cardsTable)
          .where(eq(cardsTable.seasonId, payment.seasonId));
        
        // Calculate community splits based on card rarity
        for (const holder of holders) {
          if (holder.ownerId) {
            const amount = calculateCommunitySplit(payment.amount, holder.rarity) / holders.length;
            
            // Add transfer instruction to transaction
            tx.add(
              createTransferInstruction(
                new PublicKey(process.env.TREASURY_TOKEN_ACCOUNT!),
                new PublicKey(holder.ownerId),
                wallet.publicKey,
                Math.floor(amount * 1e6), // Convert to Solana token decimals
                [],
                TOKEN_PROGRAM_ID
              )
            );
          }
        }
      }
    }
    
    // Send the transaction to Solana network
    try {
      const signature = await connection.sendTransaction(tx, [wallet]);
      console.log(`Transaction sent with signature: ${signature}`);
      
      // Update payments as processed in database
      await db
        .update(paymentsTable)
        .set({ processed: true })
        .where(eq(paymentsTable.processed, false));
      
      // Clear processed payments from Redis queue
      await clearProcessedPayments(payments.length);
      
      res.status(200).json({ 
        success: true, 
        processed: payments.length,
        signature
      });
    } catch (error) {
      console.error('Failed to send Solana transaction:', error);
      throw new Error('Transaction failed to execute');
    }
    
  } catch (error) {
    console.error('Payment processing error:', error);
    Sentry.captureException(error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process payments' 
    });
  }
});

// Get payment history
router.get('/history', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const payments = await db
      .select()
      .from(paymentsTable)
      .orderBy(desc(paymentsTable.createdAt))
      .limit(100);
      
    res.json(payments);
  } catch (error) {
    console.error('Payment history error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get payment statistics by season
router.get('/stats/:seasonId', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const schema = z.object({ seasonId: z.string() });
    const { seasonId } = schema.parse(req.params);
    
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.seasonId, seasonId));
      
    // Calculate statistics
    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
      communityPayments: payments.filter(p => p.type === 'community').length,
      platformPayments: payments.filter(p => p.type === 'platform').length,
      processedPayments: payments.filter(p => p.processed).length,
      pendingPayments: payments.filter(p => !p.processed).length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Payment stats error:', error);
    Sentry.captureException(error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

export default router; 