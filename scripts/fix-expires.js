const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL }
  }
});

async function main() {
  const records = await prisma.dispenserConsumableHistory.findMany({
    where: { expiresAt: null, removedAt: null }
  });
  console.log('Records without expiresAt:', records.length);

  for (const r of records) {
    const catalog = await prisma.materialCatalog.findUnique({ where: { code: r.materialCode } });
    if (catalog && catalog.expirationMonths) {
      const expiresAt = new Date(r.installedAt);
      expiresAt.setMonth(expiresAt.getMonth() + catalog.expirationMonths);
      await prisma.dispenserConsumableHistory.update({
        where: { id: r.id },
        data: { expiresAt }
      });
      console.log('Updated', r.nombre, '-> expiresAt:', expiresAt.toISOString());
    } else {
      console.log('Skipped', r.nombre, '(no catalog expirationMonths found)');
    }
  }
  console.log('Done!');
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
