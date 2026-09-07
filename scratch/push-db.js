const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

console.log('Running: npx prisma db push --skip-generate ...');
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });

console.log('Running: npx prisma generate --no-engine ...');
execSync('npx prisma generate --no-engine', { stdio: 'inherit', env: process.env });

const pnpmPrisma = path.resolve(__dirname, '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma/client');
const directPrisma = path.resolve(__dirname, '../node_modules/.prisma/client');
if (fs.existsSync(pnpmPrisma) && fs.existsSync(directPrisma)) {
  const files = fs.readdirSync(pnpmPrisma).filter(f => f.startsWith('index') || f.endsWith('.d.ts') || f.endsWith('.js'));
  files.forEach(f => {
    fs.copyFileSync(path.join(pnpmPrisma, f), path.join(directPrisma, f));
  });
  console.log('Copied generated Prisma client files to node_modules/.prisma/client');
}
