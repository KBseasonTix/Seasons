import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import * as Sentry from '@sentry/node';

// Load environment variables
config();

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(Sentry.Handlers.requestHandler());
app.use(cors());
app.use(express.json());

// Routes
import userRoutes from './routes/users';
import seasonRoutes from './routes/seasons';
import packRoutes from './routes/packs';
import cardRoutes from './routes/cards';
import socialRoutes from './routes/social';
import paymentRoutes from './routes/payments';

app.use('/api/users', userRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/payments', paymentRoutes);

// Error handling
app.use(Sentry.Handlers.errorHandler());
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 