export const INITIAL_SALE_PRICE = 3.75;

export const calculateInitialDistribution = (price: number) => ({
  uploader: price * 0.875,
  treasury: price * 0.125, // 2.5% platform + 10% community
});

export const calculateSecondarySale = (sellerPrice: number) => ({
  seller: sellerPrice,
  totalPrice: sellerPrice * 1.175, // Seller price + 17.5% fees
  fees: {
    uploader: sellerPrice * 0.05,
    community: sellerPrice * 0.1,
    platform: sellerPrice * 0.025,
  },
});

export const calculateCommunitySplit = (amount: number, rarity: string): number => {
  switch (rarity) {
    case 'platinum': return amount * 0.5;
    case 'gold': return amount * 0.25;
    case 'silver': return amount * 0.15;
    case 'bronze': return amount * 0.1;
    default: return 0;
  }
}; 