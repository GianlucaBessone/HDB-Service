import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const dispensers = await prisma.dispenser.findMany({ select: { id: true, marca: true }, take: 5 });
  console.log(JSON.stringify(dispensers, null, 2));
}
main();
