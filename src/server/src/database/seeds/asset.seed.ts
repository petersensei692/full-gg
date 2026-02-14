import { DataSource } from 'typeorm';
import { Asset } from '../../fondamental/assets/entities/asset.entity';

const ASSET_NAMES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'CHF',
  'AUD',
  'NZD',
  'XAU',
  'XAG',
  'STOCKS',
];

export async function seedAssets(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(Asset);

  for (const name of ASSET_NAMES) {
    const existing = await repository.findOne({ where: { name } });
    if (!existing) {
      await repository.insert({ name });
      console.log(`  ✓ Asset "${name}" seeded`);
    } else {
      console.log(`  - Asset "${name}" already exists, skipped`);
    }
  }
}
