import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { seedAssets } from './asset.seed';
import { Asset } from '../../fondamental/assets/entities/asset.entity';

// Root .env: when cwd is src/server, go up one level
const cwd = process.cwd();
config({ path: path.resolve(cwd, cwd.replace(/[/\\]+$/, '').endsWith('server') ? '../.env' : '.env') });

async function runSeeds(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
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
