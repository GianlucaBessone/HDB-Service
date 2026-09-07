const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Temporarily add output to generator
const modifiedSchema = schemaContent.replace(
  /generator client \{([\s\S]*?)\}/,
  'generator client {$1\n  output = "../node_modules/.prisma/client_tmp"\n}'
);

try {
  fs.writeFileSync(schemaPath, modifiedSchema, 'utf8');
  console.log('Generating Prisma Client to client_tmp...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  const tmpDir = path.resolve(__dirname, '../node_modules/.prisma/client_tmp');
  const targetDir1 = path.resolve(__dirname, '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client');
  const targetDir2 = path.resolve(__dirname, '../node_modules/.prisma/client');

  const files = fs.readdirSync(tmpDir);
  for (const file of files) {
    if (file.endsWith('.dll.node')) continue; // Skip locked dll
    const src = path.join(tmpDir, file);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      if (fs.existsSync(targetDir1)) fs.cpSync(src, path.join(targetDir1, file), { recursive: true });
      if (fs.existsSync(targetDir2)) fs.cpSync(src, path.join(targetDir2, file), { recursive: true });
    } else {
      if (fs.existsSync(targetDir1)) fs.copyFileSync(src, path.join(targetDir1, file));
      if (fs.existsSync(targetDir2)) fs.copyFileSync(src, path.join(targetDir2, file));
    }
  }
  console.log('Successfully updated Prisma client JS and TypeScript definitions!');
} finally {
  fs.writeFileSync(schemaPath, schemaContent, 'utf8');
}
