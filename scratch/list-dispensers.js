const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.dispenser.findMany({
  take: 10,
  select: { id: true, marca: true, modelo: true, status: true, plantId: true, clientId: true, locationId: true }
}).then(d => {
  console.log(JSON.stringify(d, null, 2));
  p.$disconnect();
});
