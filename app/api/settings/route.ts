import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireRole('ADMIN', 'SUPERVISOR');
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get('keys');
    
    const where = keysParam ? { key: { in: keysParam.split(',') } } : {};
    
    const settings = await prisma.systemSetting.findMany({ where });
    
    const result = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] GET /api/settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole('ADMIN');
    const body = await req.json();
    
    const transactions = Object.entries(body).map(([key, value]) => {
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), id: `setting_${key}` },
      });
    });
    
    await prisma.$transaction(transactions);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] PUT /api/settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
