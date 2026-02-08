import dotenv from 'dotenv';

import { PrismaClient as DashboardPrismaClient } from '../generated/prisma/dashboard';
import { PrismaClient as TinybotsPrismaClient } from '../generated/prisma/tinybots';

dotenv.config();

const defaultTinybotsDatabaseUrl =
  'mysql://root:ICgVcbpYW731vY3UjexgAnuQ69Wv2DdN@127.0.0.1:1123/tinybots';
const defaultDashboardDatabaseUrl =
  'mysql://root:ICgVcbpYW731vY3UjexgAnuQ69Wv2DdN@127.0.0.1:1124/dashboard';

export const tinybots = new TinybotsPrismaClient({
  datasources: {
    db: {
      url: process.env.TINYBOTS_DATABASE_URL ?? defaultTinybotsDatabaseUrl,
    },
  },
});
export const dashboard = new DashboardPrismaClient({
  datasources: {
    db: {
      url: process.env.DASHBOARD_DATABASE_URL ?? defaultDashboardDatabaseUrl,
    },
  },
});

export async function connectAll() {
  await tinybots.$connect();
  await dashboard.$connect();
}

export async function disconnectAll() {
  await Promise.all([tinybots.$disconnect(), dashboard.$disconnect()]);
}
