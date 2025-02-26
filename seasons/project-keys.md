# Project Keys and References

## Solana Keys
- **Project Wallet Public Key**: 2i7s8cHc3ro6XcRh8EehfgyhA1EtYubji1B8ixx2BJ35
- **Keypair Location**: seasons/platform-keypair.json
- **Solana Network**: Devnet (https://api.devnet.solana.com)
- **Seed Phrase** (KEEP SECURE, NEVER SHARE): fish august lab simple afraid access address bus hour lens twenty merge
- **WARNING**: The seed phrase above can be used to recover your wallet and access your funds. Store it securely and never share it with anyone.

## Environment Variables
### Frontend (.env.local)
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_R2_ACCESS_KEY=your_r2_access_key
```

### Backend (.env)
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

## API Endpoints
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000

### API Routes
- User Authentication: `/users/login`
- User Profile: `/users/{id}`
- User Search: `/users/search?query={query}`
- User Subscribe: `/users/subscribe`
- Season Creation: `/seasons/create`
- User Seasons: `/seasons/user/{id}`
- Buy Packs: `/packs/buy`
- Marketplace Cards: `/cards/market`
- Activity Feed: `/activities`
- Process Payments: `/payments/process`
- Payment History: `/payments/history`
- Payment Stats: `/payments/stats/{seasonId}`

## Token Program IDs
- **SPL Token Program ID**: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

## External Services
- **Stripe**: Payment processing
- **R2**: File storage for NFT assets
- **Solana**: Blockchain for NFTs and tokens

## Database Tables
- users
- seasons
- cards
- payments
- activities

## File Upload
- Endpoint: `https://your-r2-endpoint.com/upload`
- Required Header: `Authorization: Bearer ${process.env.NEXT_PUBLIC_R2_ACCESS_KEY}` 