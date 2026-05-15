#!/usr/bin/env bash
# optimize.sh – apply cache headers, revalidate tags, and add middleware/provider files
set -e
ROOT=$(pwd)
API_DIR="$ROOT/app/api"

# 1. Ensure middleware.ts exists
if [ ! -f "$ROOT/middleware.ts" ]; then
cat > "$ROOT/middleware.ts" <<'EOF'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (request.method === 'GET') {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=60'
    );
  }
  return response;
}
export const config = { matcher: ['/api/:path*'] };
EOF
fi

# 2. Create PrefetchProvider.tsx
PROVIDERS_DIR="$ROOT/app/providers"
mkdir -p "$PROVIDERS_DIR"
cat > "$PROVIDERS_DIR/PrefetchProvider.tsx" <<'EOF'
import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/useAuthStore';

export function PrefetchProvider({ children }: { children: ReactNode }) {
  const { token } = useAuthStore();
  useEffect(() => {
    const endpoints = [
      '/api/dispensers',
      '/api/clients',
      '/api/plants',
      '/api/locations',
      '/api/tickets',
      '/api/stock',
      '/api/maintenance',
      '/api/sectors',
      '/api/dashboard/salud',
      '/api/dashboard/performance',
      '/api/dashboard/analytics',
    ];
    endpoints.forEach(url =>
      fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'force-cache',
        ...(token && { headers: { Authorization: `Bearer ${token}` } }),
      })
        .then(r => { if (!r.ok) console.warn(`Prefetch ${url} → ${r.status}`); return r.json(); })
        .catch(e => console.error(`Prefetch ${url} error:`, e))
    );
  }, [token]);
  return <>{children}</>;
}
EOF

# 3. Create ReactQueryProvider.tsx
cat > "$PROVIDERS_DIR/ReactQueryProvider.tsx" <<'EOF'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 min
        cacheTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
EOF

# 4. Update app/layout.tsx to wrap providers (if not already)
LAYOUT_FILE="$ROOT/app/layout.tsx"
if grep -q "PrefetchProvider" "$LAYOUT_FILE"; then
  echo "Layout already contains providers – skipping";
else
  # Insert imports after the first line
  sed -i '1a import { PrefetchProvider } from "@/providers/PrefetchProvider";\nimport { ReactQueryProvider } from "@/providers/ReactQueryProvider";' "$LAYOUT_FILE"
  # Wrap children inside providers
  perl -0777 -i -pe 's|(\<body\>\s*)|$1\n    <PrefetchProvider>\n    <ReactQueryProvider>|' "$LAYOUT_FILE"
  perl -0777 -i -pe 's|(</body>)|</ReactQueryProvider>\n    </PrefetchProvider>\n    $1|' "$LAYOUT_FILE"
fi

# Helper functions
add_revalidate() {
  local file=$1
  if grep -q "export const revalidate" "$file"; then return; fi
  # Insert after last import line
  awk 'BEGIN{found=0} {print} /import /{found=1} END{if(found) printf "\nexport const revalidate = 300; // 5 min\n"}' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

ensure_import() {
  local file=$1
  if ! grep -q "revalidateTag" "$file"; then
    sed -i "1i import { revalidateTag } from 'next/cache';" "$file"
  fi
}

add_tag_before_return() {
  local file=$1 tag=$2
  perl -i -pe "s/(return NextResponse.json\([^;]*;)/await revalidateTag('$tag');\n    $1/" "$file"
}

# Process API files
find "$API_DIR" -type f -name "*.ts" | while read f; do
  if grep -q "export async function GET" "$f"; then
    add_revalidate "$f"
  fi
  if grep -q "export async function POST" "$f" || grep -q "export async function PUT" "$f" || grep -q "export async function DELETE" "$f"; then
    ensure_import "$f"
    # Derive tag from path, e.g., dispensers/[id]/assign -> dispensers
    rel=${f#*$ROOT/app/api/}
    tag=$(echo "$rel" | cut -d/ -f1)
    add_tag_before_return "$f" "$tag"
  fi
done

echo "Optimization script completed."
