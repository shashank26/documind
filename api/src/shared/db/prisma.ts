import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Config } from '../../config';

const { DB, DEBUG } = Config;

const config = DEBUG
  ? {}
  : {
      ssl: {
        rejectUnauthorized: false,
      },
    };

const adapter = new PrismaPg({
  connectionString: DB,
  ...config,
});

export const prisma = new PrismaClient({
  adapter,
  log: DEBUG ? ['query', 'error', 'warn'] : ['error'],
});
