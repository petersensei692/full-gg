import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Root .env: when cwd is src/server, go up one level
const cwd = process.cwd();
config({ path: path.resolve(cwd, cwd.replace(/[/\\]+$/, '').endsWith('server') ? '../.env' : '.env') });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
  database: process.env.DB_DATABASE || 'gg',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
