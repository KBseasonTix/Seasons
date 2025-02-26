import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} from '@solana/web3.js';
import { 
  createTransferInstruction, 
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { config } from 'dotenv';
import * as Sentry from '@sentry/node';

// Load environment variables
config();

// Validate environment variables
if (!process.env.SOLANA_RPC_URL) {
  throw new Error('SOLANA_RPC_URL environment variable is required');
}

if (!process.env.TIX_TOKEN_ADDRESS) {
  throw new Error('TIX_TOKEN_ADDRESS environment variable is required');
}

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL,
  'confirmed'
);

// TIX token mint address
const tixMint = new PublicKey(process.env.TIX_TOKEN_ADDRESS);

/**
 * Get the platform wallet from the environment
 * @returns Keypair for the platform wallet
 */
const getPlatformWallet = (): Keypair => {
  if (!process.env.PLATFORM_WALLET_SECRET) {
    throw new Error('PLATFORM_WALLET_SECRET environment variable is required');
  }
  
  return Keypair.fromSecretKey(
    Buffer.from(process.env.PLATFORM_WALLET_SECRET, 'hex')
  );
};

/**
 * Transfer TIX tokens from one wallet to another
 * @param fromPublicKey Source wallet public key
 * @param toPublicKey Destination wallet public key
 * @param amount Amount of TIX to transfer
 * @returns Transaction signature
 */
export const transferTIX = async (
  fromPublicKey: string,
  toPublicKey: string,
  amount: number
): Promise<string> => {
  try {
    const from = new PublicKey(fromPublicKey);
    const to = new PublicKey(toPublicKey);
    
    // Convert amount to token units (assuming 6 decimals for TIX)
    const tokenAmount = Math.floor(amount * 1_000_000);
    
    // Get platform wallet for signing
    const platformWallet = getPlatformWallet();
    
    // Get token accounts for the wallets
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      platformWallet,
      tixMint,
      from
    );
    
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      platformWallet,
      tixMint,
      to
    );
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      from,
      tokenAmount,
      [platformWallet]
    );
    
    // Create transaction and add the transfer instruction
    const transaction = new Transaction().add(transferInstruction);
    
    // Set recent blockhash and sign transaction
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    
    transaction.feePayer = platformWallet.publicKey;
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [platformWallet]
    );
    
    console.log(`TIX transfer successful: ${signature}`);
    return signature;
  } catch (error) {
    console.error('Error transferring TIX:', error);
    Sentry.captureException(error);
    throw new Error(`Failed to transfer TIX: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Mint a new season NFT on Solana
 * @param season Season object with metadata
 * @returns Mint address of the created NFT
 */
export const mintSeason = async (season: any): Promise<string> => {
  try {
    // Implementation would involve creating a new NFT mint
    // This is a simplified placeholder for the actual implementation
    
    const platformWallet = getPlatformWallet();
    
    // Generate a new keypair for the NFT mint
    const mintKeypair = Keypair.generate();
    
    // Return the mint address as a string
    const mintAddress = mintKeypair.publicKey.toString();
    
    console.log(`Season minted with address: ${mintAddress}`);
    return mintAddress;
  } catch (error) {
    console.error('Error minting season:', error);
    Sentry.captureException(error);
    throw new Error(`Failed to mint season: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export default {
  connection,
  tixMint,
  transferTIX,
  mintSeason
}; 