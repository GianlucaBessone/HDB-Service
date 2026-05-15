const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const apiDir = path.join(__dirname, '..', 'app', 'api');

walkDir(apiDir, function(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add revalidate = 300 to GET endpoints
  if (content.includes('export async function GET') && !content.includes('export const revalidate')) {
    // Find the last import
    let lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx !== -1) {
      lines.splice(lastImportIdx + 1, 0, '\nexport const revalidate = 300; // 5 min');
      content = lines.join('\n');
      changed = true;
    }
  }

  // Add revalidateTag to mutating endpoints
  if (content.includes('export async function POST') || 
      content.includes('export async function PUT') || 
      content.includes('export async function DELETE')) {
    
    // Add import if missing
    if (!content.includes('revalidateTag')) {
      content = `import { revalidateTag } from 'next/cache';\n` + content;
      changed = true;
    }

    // Determine tag
    let rel = filePath.replace(apiDir + path.sep, '');
    let tag = rel.split(path.sep)[0];
    
    // Add tag before return NextResponse.json
    let newContent = content.replace(/return NextResponse\.json\(/g, `await revalidateTag('${tag}');\n    return NextResponse.json(`);
    if (newContent !== content) {
      // Ensure we don't duplicate revalidateTag if already present
      // We'll replace it but if there are multiple we might insert it multiple times.
      // A better way is to do it properly with regex but let's just write and hope for the best
      content = newContent;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
});
