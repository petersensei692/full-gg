import { DataSource } from 'typeorm';
import { Asset } from '../../fondamental/assets/entities/asset.entity';

const ASSET_SEED: {
  name: string;
  type: string;
  sortOrder: number;
  place: number;
  isTradable: boolean;
}[] = [
  { name: 'USD', type: 'currency', sortOrder: 0, place: 1, isTradable: true },
  { name: 'EUR', type: 'currency', sortOrder: 1, place: 2, isTradable: true },
  { name: 'GBP', type: 'currency', sortOrder: 2, place: 3, isTradable: true },
  { name: 'JPY', type: 'currency', sortOrder: 3, place: 4, isTradable: true },
  { name: 'CAD', type: 'currency', sortOrder: 4, place: 5, isTradable: true },
  { name: 'CHF', type: 'currency', sortOrder: 5, place: 6, isTradable: true },
  { name: 'AUD', type: 'currency', sortOrder: 6, place: 7, isTradable: true },
  { name: 'NZD', type: 'currency', sortOrder: 7, place: 8, isTradable: true },
  { name: 'XAU', type: 'commodity', sortOrder: 0, place: 1, isTradable: true },
  { name: 'XAG', type: 'commodity', sortOrder: 1, place: 2, isTradable: true },
  { name: 'WTI', type: 'commodity', sortOrder: 2, place: 3, isTradable: true },
  { name: 'STOCKS', type: 'stocks', sortOrder: 0, place: 1, isTradable: false },
];

export async function seedAssets(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Asset);

  for (const row of ASSET_SEED) {
    const existing = await repository.findOne({ where: { name: row.name } });
    if (!existing) {
      await repository.insert(row);
      console.log(`  ✓ Asset "${row.name}" seeded (${row.type}, place ${row.place})`);
    } else if (existing.isTradable == null) {
      existing.isTradable = row.isTradable;
      await repository.save(existing);
    }
  }
}
