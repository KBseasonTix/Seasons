import { z } from 'zod';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { v4 as uuidv4 } from 'uuid';

export const CreateSeasonInput = z.object({
  uris: z.array(z.string().url()).length(10),
  userId: z.string(),
});

export type Season = {
  id: string;
  userId: string;
  uri: string;
  merkleRoot: string;
};

export type Card = {
  seasonId: string;
  leaf: string;
  rarity: 'platinum' | 'gold' | 'silver' | 'bronze';
  ownerId: string | null;
  purchasePrice: number | null;
};

export const createSeason = (input: z.infer<typeof CreateSeasonInput>): { seasons: Season[]; cards: Card[] } => {
  const { uris, userId } = CreateSeasonInput.parse(input);
  const seasons: Season[] = [];
  const allCards: Card[] = [];

  for (const uri of uris) {
    const leaves = Array(50).fill(null).map(() => keccak256(uuidv4()));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const season: Season = {
      id: uuidv4(),
      userId,
      uri,
      merkleRoot: tree.getHexRoot(),
    };
    const cards: Card[] = leaves.map((leaf, i) => ({
      seasonId: season.id,
      leaf: leaf.toString('hex'),
      rarity: assignRarity(i),
      ownerId: null,
      purchasePrice: null,
    }));
    seasons.push(season);
    allCards.push(...cards);
  }
  return { seasons, cards: allCards };
};

const assignRarity = (index: number): Card['rarity'] =>
  index === 0 ? 'platinum' : index < 5 ? 'gold' : index < 20 ? 'silver' : 'bronze'; 