import { DataSource } from 'typeorm';
import { readAppConfig, resolveDatabasePath } from '../app-config';
import { seedAssets } from './asset.seed';
import { seedPairsPipsValues, seedTradesForPairs } from './analytics.seed';
import { Asset } from '../../fondamental/assets/entities/asset.entity';
import { PairPipsValue } from '../../analytics/pairs-pips-values/entities/pair-pips-value.entity';
import { Trade } from '../../analytics/trades/entities/trade.entity';
import { WatchItem } from '../../fondamental/assets/watch-items/entities/watch-item.entity';
import { WeeklyWatchlist } from '../../fondamental/weekly/weekly-watchlist/entities/weekly-watchlist.entity';
import { AssetWatchlist } from '../../fondamental/weekly/weekly-watchlist/asset-watchlist/entities/asset-watchlist.entity';

const appConfig = readAppConfig();
const databasePath = resolveDatabasePath(appConfig);

const dataSource = new DataSource({
  type: 'better-sqlite3',
  database: databasePath,
  entities: [Asset, PairPipsValue, Trade, WatchItem, WeeklyWatchlist, AssetWatchlist],
  synchronize: true,
});

async function runSeeds(): Promise<void> {
  try {
    await dataSource.initialize();
    console.log('Database connected. Running seeds...\n');

    console.log('Seeding assets...');
    await seedAssets(dataSource);
    console.log('\nSeeding pairs pips values...');
    await seedPairsPipsValues(dataSource);
    console.log('\nSeeding trades...');
    await seedTradesForPairs(dataSource);

    console.log('\nSeeds completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
