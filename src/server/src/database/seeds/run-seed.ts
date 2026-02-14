import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { seedAssets } from './asset.seed';
import { Asset } from '../../fondamental/assets/entities/asset.entity';

// Load .env from project root (run-seed.ts is in src/server/src/database/seeds → 4 levels up to root)
config({ path: path.resolve(__dirname, '../../../../.env') });

async function runSeeds(): Promise<void> {
  const password = process.env.DB_PASSWORD;
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: password !== undefined && password !== null ? String(password) : '2022',
    database: process.env.DB_DATABASE || 'gg',
    entities: [Asset],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected. Running seeds...\n');

    console.log('Seeding assets...');
    await seedAssets(dataSource);

    console.log('\nSeeds completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
