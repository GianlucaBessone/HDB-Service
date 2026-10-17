import { PrismaClient } from '@prisma/client';

export type ExtendedPrismaClient = PrismaClient & {
  readonly equipment: PrismaClient['dispenser'];
  readonly equipmentLocationHistory: PrismaClient['dispenserLocationHistory'];
  readonly equipmentRepairHistory: PrismaClient['dispenserRepairHistory'];
  readonly equipmentConsumableHistory: PrismaClient['dispenserConsumableHistory'];
  readonly equipmentSparePartHistory: PrismaClient['dispenserSparePartHistory'];
};

function createExtendedPrismaClient(): ExtendedPrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  Object.defineProperties(client, {
    equipment: { get: () => client.dispenser, enumerable: false },
    equipmentLocationHistory: { get: () => client.dispenserLocationHistory, enumerable: false },
    equipmentRepairHistory: { get: () => client.dispenserRepairHistory, enumerable: false },
    equipmentConsumableHistory: { get: () => client.dispenserConsumableHistory, enumerable: false },
    equipmentSparePartHistory: { get: () => client.dispenserSparePartHistory, enumerable: false },
  });

  return client as ExtendedPrismaClient;
}

const globalForPrisma = global as unknown as { prisma: ExtendedPrismaClient };

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma || createExtendedPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

