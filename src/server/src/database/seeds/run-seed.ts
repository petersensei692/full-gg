import { DataSource } from 'typeorm';
import { readAppConfig, resolveDatabasePath } from '../app-config';
import { seedAssets } from './asset.seed';
import { Asset } from '../../fondamental/assets/entities/asset.entity';

const appConfig = readAppConfig();
const databasePath = resolveDatabasePath(appConfig);

const dataSource = new DataSource({
  type: 'better-sqlite3',
  database: databasePath,
  entities: [Asset],
  synchronize: true,
});

async function runSeeds(): Promise<void> {
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
