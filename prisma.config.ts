import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
const isPostgres = url.startsWith('postgres');

export default defineConfig({
  schema: isPostgres ? 'prisma/schema.prod.prisma' : 'prisma/schema.prisma',
  migrations: {
    path: isPostgres ? 'prisma/migrations-pg' : 'prisma/migrations',
  },
  datasource: { url },
});
