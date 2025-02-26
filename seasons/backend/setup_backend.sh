#!/bin/bash

# Exit on any error
set -e

echo "Setting up backend dependencies..."

# Install primary dependencies
npm install express cors dotenv zod drizzle-orm pg redis @sentry/node jsonwebtoken

# Install Solana and crypto-related dependencies
npm install @solana/web3.js @solana/spl-token merkletreejs keccak256 uuid

# Install Stripe for payment processing
npm install stripe speakeasy

# Install development dependencies
npm install --save-dev typescript ts-node @types/node @types/express @types/cors @types/pg @types/jsonwebtoken @types/uuid jest @types/jest

# Create tsconfig.json if it doesn't exist
if [ ! -f "tsconfig.json" ]; then
  echo "Creating tsconfig.json..."
  cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
EOF
fi

# Create .env file template if it doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env template..."
  cat > .env << EOF
# Database
DATABASE_URL=postgres://user:password@localhost:5432/seasons

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Sentry
SENTRY_DSN=your_sentry_dsn_here

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_WALLET_SECRET=your_wallet_private_key_in_hex
TREASURY_TOKEN_ACCOUNT=your_treasury_token_account_address

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID=your_stripe_subscription_price_id

# Server
PORT=3001
NODE_ENV=development
EOF
fi

# Create package.json scripts
npm pkg set scripts.start="node dist/main.js"
npm pkg set scripts.dev="ts-node src/main.ts"
npm pkg set scripts.build="tsc"
npm pkg set scripts.test="jest"

echo "Backend setup complete!" 