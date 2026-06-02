import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Perform a simple query to verify database connection is alive
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      services: {
        database: 'HEALTHY',
      },
    });
  } catch (error: any) {
    console.error('[Health Check] Failure:', error);
    return NextResponse.json(
      {
        status: 'DOWN',
        timestamp: new Date().toISOString(),
        error: error.message || 'Database connection failed',
      },
      { status: 500 }
    );
  }
}
