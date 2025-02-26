# TixMarket - Seasons NFT Marketplace

TixMarket (Seasons) is a full-stack NFT marketplace application built on the Solana blockchain. It allows users to create seasons (collections), mint and trade NFT cards, buy packs, and engage in social interactions around their digital collectibles.

## Project Structure

The project is divided into two main components:

### Backend (Node.js/Express)
- RESTful API built with Express
- Solana blockchain integration using @solana/web3.js and @solana/spl-token
- PostgreSQL database with Drizzle ORM
- Redis for caching
- Authentication using JWT
- Payment processing with Stripe
- Error tracking with Sentry

### Frontend (Next.js)
- React-based UI with Next.js
- Wallet integration for Solana
- Responsive design
- State management
- Payment processing with Stripe

## Key Features

- User authentication and profiles
- Season (collection) creation and management
- Card minting, trading, and marketplace
- Pack purchasing and opening
- Activity feed and social interactions
- Payment processing and history
- NFT storage using R2

## Getting Started

### Prerequisites

- Node.js (v16+)
- PostgreSQL
- Redis
- Solana CLI tools
- Stripe account (for payments)

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/seasons.git
cd seasons
```

2. **Set up the backend**

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory with the following variables:

```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/seasons
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
SOLANA_RPC_URL=https://api.devnet.solana.com
PLATFORM_WALLET_SECRET=your_platform_wallet_private_key
TREASURY_TOKEN_ACCOUNT=your_treasury_token_account
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

3. **Set up the frontend**

```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the frontend directory with:

```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_R2_ACCESS_KEY=your_r2_access_key
```

4. **Start the development servers**

For the backend:
```bash
cd backend
npm run dev
```

For the frontend:
```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:3000 and the backend API at http://localhost:3001.

## API Endpoints

- User Authentication: `/api/users/login`
- User Profile: `/api/users/{id}`
- User Search: `/api/users/search?query={query}`
- User Subscribe: `/api/users/subscribe`
- Season Creation: `/api/seasons/create`
- User Seasons: `/api/seasons/user/{id}`
- Buy Packs: `/api/packs/buy`
- Marketplace Cards: `/api/cards/market`
- Social Activities: `/api/social`
- Process Payments: `/api/payments/process`
- Payment History: `/api/payments/history`
- Payment Stats: `/api/payments/stats/{seasonId}`

## Solana Integration

The project uses the Solana blockchain (Devnet) for:
- NFT minting
- Token transfers
- Collection management

## Security Notes

- Keep your seed phrases and private keys secure
- Environment variables contain sensitive information
- The project includes a platform wallet for handling transactions

## License

[License information]

## Contributors

[List of contributors] 