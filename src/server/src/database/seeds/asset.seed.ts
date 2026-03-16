import { DataSource } from 'typeorm';
import { Asset } from '../../fondamental/assets/entities/asset.entity';

const ASSET_SEED: { name: string; type: string; sortOrder: number; place: number }[] = [
  { name: 'USD', type: 'currency', sortOrder: 0, place: 1 },
  { name: 'EUR', type: 'currency', sortOrder: 1, place: 2 },
  { name: 'GBP', type: 'currency', sortOrder: 2, place: 3 },
  { name: 'JPY', type: 'currency', sortOrder: 3, place: 4 },
  { name: 'CAD', type: 'currency', sortOrder: 4, place: 5 },
  { name: 'CHF', type: 'currency', sortOrder: 5, place: 6 },
  { name: 'AUD', type: 'currency', sortOrder: 6, place: 7 },
  { name: 'NZD', type: 'currency', sortOrder: 7, place: 8 },
  { name: 'XAU', type: 'commodity', sortOrder: 0, place: 1 },
  { name: 'XAG', type: 'commodity', sortOrder: 1, place: 2 },
  { name: 'STOCKS', type: 'stocks', sortOrder: 0, place: 1 },
];

export async function seedAssets(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Asset);

  for (const { name, type, sortOrder, place } of ASSET_SEED) {
    const existing = await repository.findOne({ where: { name } });
    if (!existing) {
      await repository.insert({ name, type, sortOrder, place });
      console.log(`  ✓ Asset "${name}" seeded (${type}, place ${place})`);
    } else {
      await repository.update(existing.id, { type, sortOrder, place });
      console.log(`  - Asset "${name}" updated (${type}, place ${place})`);
    }
  }
}
